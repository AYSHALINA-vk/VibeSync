// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TravelEscrow
/// @notice Single-payer escrow for one travel booking, paid in the chain's native coin (test ETH).
/// @dev Demo contract, not audited. The `issuer` is a trusted address run by the VibeTrip backend.
///      It stands in for a booking provider's cancellation confirmation. Do not use with real funds.
contract TravelEscrow {
    enum Status { None, Funded, Released, Refunded }

    struct Booking {
        address payer;
        address recipient;
        uint256 amount;
        uint64 cancelDeadline;    // until this time a payer cancellation refunds refundBeforeBps
        uint64 releaseTime;       // from this time the funds may go to the recipient
        uint16 refundBeforeBps;   // 10000 = 100%
        uint16 refundAfterBps;
        Status status;
    }

    address public immutable issuer;
    mapping(bytes32 => Booking) private bookings;
    bool private locked;

    event BookingFunded(
        bytes32 indexed id, address indexed payer, address indexed recipient, uint256 amount,
        uint64 cancelDeadline, uint64 releaseTime, uint16 refundBeforeBps, uint16 refundAfterBps
    );
    event PayerCancelled(bytes32 indexed id, uint256 refundToPayer, uint256 paidToRecipient);
    event ProviderCancellationConfirmed(bytes32 indexed id, uint256 refundToPayer);
    event Released(bytes32 indexed id, uint256 amount);

    constructor(address _issuer) {
        require(_issuer != address(0), "issuer required");
        issuer = _issuer;
    }

    modifier nonReentrant() {
        require(!locked, "reentrant call");
        locked = true;
        _;
        locked = false;
    }

    /// @notice The payer funds a booking in one transaction. msg.value is the booking amount.
    function fundBooking(
        bytes32 id, address recipient, uint64 cancelDeadline, uint64 releaseTime,
        uint16 refundBeforeBps, uint16 refundAfterBps
    ) external payable {
        require(bookings[id].status == Status.None, "booking exists");
        require(msg.value > 0, "amount required");
        require(recipient != address(0) && recipient != msg.sender, "bad recipient");
        require(cancelDeadline > block.timestamp, "deadline in the past");
        require(releaseTime >= cancelDeadline, "release before deadline");
        require(refundBeforeBps <= 10000 && refundAfterBps <= refundBeforeBps, "bad refund policy");

        bookings[id] = Booking(
            msg.sender, recipient, msg.value, cancelDeadline, releaseTime,
            refundBeforeBps, refundAfterBps, Status.Funded
        );
        emit BookingFunded(id, msg.sender, recipient, msg.value, cancelDeadline, releaseTime, refundBeforeBps, refundAfterBps);
    }

    /// @notice The payer cancels before the release time. The refund follows the agreed policy.
    function cancelByPayer(bytes32 id) external nonReentrant {
        Booking storage b = bookings[id];
        require(b.status == Status.Funded, "not funded");
        require(msg.sender == b.payer, "only payer");
        require(block.timestamp < b.releaseTime, "too late to cancel");

        uint16 bps = block.timestamp <= b.cancelDeadline ? b.refundBeforeBps : b.refundAfterBps;
        uint256 refund = (b.amount * bps) / 10000;
        uint256 rest = b.amount - refund;

        b.status = Status.Refunded;
        emit PayerCancelled(id, refund, rest);
        _send(b.payer, refund);
        _send(b.recipient, rest);
    }

    /// @notice The issuer confirms the provider cancelled. The payer gets a full refund.
    function confirmProviderCancellation(bytes32 id) external nonReentrant {
        Booking storage b = bookings[id];
        require(msg.sender == issuer, "only issuer");
        require(b.status == Status.Funded, "not funded");

        b.status = Status.Refunded;
        emit ProviderCancellationConfirmed(id, b.amount);
        _send(b.payer, b.amount);
    }

    /// @notice Pay the recipient. The payer may do this any time. Others only after the release time.
    function release(bytes32 id) external nonReentrant {
        Booking storage b = bookings[id];
        require(b.status == Status.Funded, "not funded");
        require(
            msg.sender == b.payer ||
            (block.timestamp >= b.releaseTime && (msg.sender == b.recipient || msg.sender == issuer)),
            "not allowed yet"
        );

        b.status = Status.Released;
        emit Released(id, b.amount);
        _send(b.recipient, b.amount);
    }

    function getBooking(bytes32 id) external view returns (Booking memory) {
        return bookings[id];
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "transfer failed");
    }
}
