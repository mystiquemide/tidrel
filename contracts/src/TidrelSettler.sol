// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title TidrelSettler
/// @notice Pays every counterparty of one trade settlement in a single transaction and
/// records the trade reference on-chain so it can be used only once per payer.
/// @dev Holds no funds, has no owner, no fees and no upgrade path. It moves USDC straight
/// from the payer to each recipient using the payer's allowance, so nothing stays in the
/// contract. Meant to be called through a sender-preserving batch (Multicall3From) that
/// first approves the exact total, but works with any prior allowance.
contract TidrelSettler {
    /// @notice USDC on Arc (6 decimals). Fixed at deploy.
    IERC20 public immutable usdc;

    /// @notice Most payouts one settlement may carry. Keeps the batch inside the block gas limit.
    uint256 public constant MAX_LEGS = 50;

    /// @notice settled[payer][ref] is true once `payer` has settled `ref`.
    mapping(address payer => mapping(bytes32 ref => bool)) public settled;

    /// @notice One event per settlement.
    event Settled(address indexed payer, bytes32 indexed ref, uint256 total, uint256 legs);
    /// @notice One event per payout.
    event Leg(address indexed payer, bytes32 indexed ref, address indexed to, uint256 amount);

    error ReferenceUsed(address payer, bytes32 ref);
    error EmptyReference();
    error LengthMismatch();
    error NoLegs();
    error TooManyLegs(uint256 legs);
    error ZeroRecipient(uint256 index);
    error ZeroAmount(uint256 index);
    error TransferFailed(uint256 index);

    constructor(IERC20 usdc_) {
        usdc = usdc_;
    }

    /// @notice Pay `amounts[i]` USDC to `recipients[i]` from the caller, all or nothing.
    /// @param ref Trade reference. Cannot be zero and cannot repeat for the same caller.
    function settle(bytes32 ref, address[] calldata recipients, uint256[] calldata amounts) external {
        if (ref == bytes32(0)) revert EmptyReference();
        if (settled[msg.sender][ref]) revert ReferenceUsed(msg.sender, ref);
        uint256 n = recipients.length;
        if (n != amounts.length) revert LengthMismatch();
        if (n == 0) revert NoLegs();
        if (n > MAX_LEGS) revert TooManyLegs(n);

        // Effects before interactions.
        settled[msg.sender][ref] = true;

        uint256 total;
        for (uint256 i; i < n; ++i) {
            address to = recipients[i];
            uint256 amount = amounts[i];
            if (to == address(0)) revert ZeroRecipient(i);
            if (amount == 0) revert ZeroAmount(i);
            total += amount;
            if (!_pull(msg.sender, to, amount)) revert TransferFailed(i);
            emit Leg(msg.sender, ref, to, amount);
        }
        emit Settled(msg.sender, ref, total, n);
    }

    /// @dev transferFrom that also accepts tokens returning no data, and fails on false.
    function _pull(address from, address to, uint256 amount) private returns (bool) {
        (bool ok, bytes memory ret) = address(usdc).call(
            abi.encodeCall(IERC20.transferFrom, (from, to, amount))
        );
        return ok && (ret.length == 0 || abi.decode(ret, (bool)));
    }
}
