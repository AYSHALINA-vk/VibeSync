-- 07_invitations.sql: mutual travel invitations, connections, notifications, private messages
-- Requires: 01_schema (profiles, trips), 02_flags, 05_safety (blocks: blocker_id, blocked_id)
-- Run once in the Supabase SQL Editor.

-- ---------- helpers ----------
create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- ---------- invitations ----------
create table travel_invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,   -- the receiver's trip they are interested in
  message text check (message is null or char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  destination text,
  overlap_days int,
  score int check (score between 0 and 100),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_invite check (sender_id <> receiver_id)
);
-- only ONE pending invitation per pair, in either direction
create unique index one_pending_per_pair on travel_invitations
  (least(sender_id, receiver_id), greatest(sender_id, receiver_id)) where status = 'pending';
create index on travel_invitations (receiver_id, status, created_at desc);
create index on travel_invitations (sender_id, created_at desc);

-- ---------- mutual connections (user_a is always the smaller id) ----------
create table travel_connections (
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  invitation_id uuid references travel_invitations(id) on delete set null,
  destination text,
  overlap_days int,
  score int,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create or replace function are_connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from travel_connections where user_a = least(a, b) and user_b = greatest(a, b))
$$;

-- ---------- notifications ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('invitation_received','invitation_accepted')),
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read, created_at desc);

-- ---------- private messages (connected travelers only) ----------
create table direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint dm_not_self check (sender_id <> receiver_id)
);
create index on direct_messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at);

-- ---------- row level security ----------
alter table travel_invitations enable row level security;
alter table travel_connections enable row level security;
alter table notifications enable row level security;
alter table direct_messages enable row level security;

create policy "participants read invitations" on travel_invitations
  for select to authenticated using (auth.uid() in (sender_id, receiver_id));

create policy "participants read connections" on travel_connections
  for select to authenticated using (auth.uid() in (user_a, user_b));

create policy "read own notifications" on notifications
  for select to authenticated using (user_id = auth.uid());
create policy "mark own notifications read" on notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own messages" on direct_messages
  for select to authenticated using (auth.uid() in (sender_id, receiver_id));
create policy "send only to connections" on direct_messages
  for insert to authenticated
  with check (sender_id = auth.uid()
              and are_connected(sender_id, receiver_id)
              and not is_blocked_between(sender_id, receiver_id));

-- Clients can never write invitations or connections directly: only the functions below can.
revoke insert, update, delete on travel_invitations, travel_connections from authenticated, anon;
-- Notifications: clients may only flip the `read` column.
revoke insert, update, delete on notifications from authenticated, anon;
grant update (read) on notifications to authenticated;
-- Messages are immutable once sent.
revoke update, delete on direct_messages from authenticated, anon;

-- ---------- send an invitation ----------
create or replace function send_invitation(p_receiver uuid, p_trip uuid, p_message text, p_score int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  rt trips%rowtype;
  st trips%rowtype;
  ov int;
  new_id uuid;
  msg text := nullif(trim(coalesce(p_message, '')), '');
begin
  if me is null then raise exception 'Please sign in first'; end if;
  if me = p_receiver then raise exception 'You cannot invite yourself'; end if;
  if msg is not null and char_length(msg) > 300 then raise exception 'Keep your message under 300 characters'; end if;
  if is_blocked_between(me, p_receiver) then raise exception 'You cannot invite this traveler'; end if;
  if are_connected(me, p_receiver) then raise exception 'You are already connected'; end if;

  select * into rt from trips where id = p_trip and user_id = p_receiver;
  if not found then raise exception 'That trip was not found'; end if;

  -- the sender's trip to the same place with the most overlap, computed here and not trusted from the browser
  select * into st from trips t
   where t.user_id = me and lower(trim(t.destination)) = lower(trim(rt.destination))
   order by (least(t.end_date, rt.end_date) - greatest(t.start_date, rt.start_date)) desc
   limit 1;
  if not found then raise exception 'You need a trip to the same destination first'; end if;

  ov := least(st.end_date, rt.end_date) - greatest(st.start_date, rt.start_date) + 1;
  if ov < 2 then raise exception 'Your dates need to overlap by at least 2 days'; end if;

  insert into travel_invitations (sender_id, receiver_id, trip_id, message, destination, overlap_days, score)
  values (me, p_receiver, rt.id, msg, rt.destination, ov, greatest(0, least(100, coalesce(p_score, 0))))
  returning id into new_id;

  insert into notifications (user_id, type, data)
  values (p_receiver, 'invitation_received', jsonb_build_object(
    'invitation_id', new_id, 'from', me,
    'from_name', (select display_name from profiles where id = me),
    'destination', rt.destination));

  return new_id;
exception when unique_violation then
  raise exception 'There is already a pending invitation between you two';
end $$;

-- ---------- accept / decline / cancel ----------
create or replace function respond_invitation(p_id uuid, p_action text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inv travel_invitations%rowtype;
  new_status text;
begin
  if me is null then raise exception 'Please sign in first'; end if;
  select * into inv from travel_invitations where id = p_id for update;
  if not found then raise exception 'Invitation not found'; end if;
  if me not in (inv.sender_id, inv.receiver_id) then raise exception 'Invitation not found'; end if;
  if inv.status <> 'pending' then raise exception 'This invitation is no longer pending'; end if;

  if p_action = 'cancel' then
    if inv.sender_id <> me then raise exception 'Only the sender can cancel'; end if;
    new_status := 'cancelled';
  elsif p_action in ('accept', 'decline') then
    if inv.receiver_id <> me then raise exception 'Only the recipient can respond'; end if;
    if p_action = 'accept' and is_blocked_between(inv.sender_id, inv.receiver_id) then
      raise exception 'This invitation can no longer be accepted';
    end if;
    new_status := case p_action when 'accept' then 'accepted' else 'declined' end;
  else
    raise exception 'Unknown action';
  end if;

  update travel_invitations set status = new_status, responded_at = now() where id = inv.id;

  -- clear the recipient's bell for this invitation
  update notifications set read = true
   where user_id = inv.receiver_id and type = 'invitation_received' and data ->> 'invitation_id' = inv.id::text;

  if new_status = 'accepted' then
    insert into travel_connections (user_a, user_b, invitation_id, destination, overlap_days, score)
    values (least(inv.sender_id, inv.receiver_id), greatest(inv.sender_id, inv.receiver_id),
            inv.id, inv.destination, inv.overlap_days, inv.score)
    on conflict do nothing;

    insert into notifications (user_id, type, data)
    values (inv.sender_id, 'invitation_accepted', jsonb_build_object(
      'invitation_id', inv.id, 'from', me,
      'from_name', (select display_name from profiles where id = me),
      'destination', inv.destination));
  end if;
  -- declines create no notification, so they stay discreet

  return new_status;
end $$;

revoke all on function send_invitation(uuid, uuid, text, int) from public, anon;
grant execute on function send_invitation(uuid, uuid, text, int) to authenticated;
revoke all on function respond_invitation(uuid, text) from public, anon;
grant execute on function respond_invitation(uuid, text) to authenticated;

-- ---------- realtime ----------
alter publication supabase_realtime add table travel_invitations, notifications, direct_messages;
