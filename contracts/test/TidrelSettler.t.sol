// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {TidrelSettler, IERC20} from "../src/TidrelSettler.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        require(allowance[f][msg.sender] >= a, "allowance");
        require(balanceOf[f] >= a, "balance");
        allowance[f][msg.sender] -= a;
        balanceOf[f] -= a;
        balanceOf[t] += a;
        return true;
    }
}

contract FalseUSDC {
    function transferFrom(address, address, uint256) external pure returns (bool) { return false; }
}

contract TidrelSettlerTest is Test {
    MockUSDC usdc;
    TidrelSettler s;
    address payer = makeAddr("payer");
    address a = makeAddr("a");
    address b = makeAddr("b");
    bytes32 constant REF = bytes32("BLK-0413");

    event Settled(address indexed payer, bytes32 indexed ref, uint256 total, uint256 legs);
    event Leg(address indexed payer, bytes32 indexed ref, address indexed to, uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        s = new TidrelSettler(IERC20(address(usdc)));
        usdc.mint(payer, 10_000_000);
        vm.prank(payer);
        usdc.approve(address(s), type(uint256).max);
    }

    function _legs(uint256 x, uint256 y) internal view returns (address[] memory r, uint256[] memory m) {
        r = new address[](2); m = new uint256[](2);
        r[0] = a; r[1] = b; m[0] = x; m[1] = y;
    }

    function test_paysEveryLegAndHoldsNothing() public {
        (address[] memory r, uint256[] memory m) = _legs(500_000, 400_000);
        vm.prank(payer);
        s.settle(REF, r, m);
        assertEq(usdc.balanceOf(a), 500_000);
        assertEq(usdc.balanceOf(b), 400_000);
        assertEq(usdc.balanceOf(payer), 10_000_000 - 900_000);
        assertEq(usdc.balanceOf(address(s)), 0);
        assertTrue(s.settled(payer, REF));
    }

    function test_emitsLegsThenSettled() public {
        (address[] memory r, uint256[] memory m) = _legs(500_000, 400_000);
        vm.expectEmit(true, true, true, true);
        emit Leg(payer, REF, a, 500_000);
        vm.expectEmit(true, true, true, true);
        emit Leg(payer, REF, b, 400_000);
        vm.expectEmit(true, true, false, true);
        emit Settled(payer, REF, 900_000, 2);
        vm.prank(payer);
        s.settle(REF, r, m);
    }

    function test_referenceCannotRepeatForSamePayer() public {
        (address[] memory r, uint256[] memory m) = _legs(1, 1);
        vm.startPrank(payer);
        s.settle(REF, r, m);
        vm.expectRevert(abi.encodeWithSelector(TidrelSettler.ReferenceUsed.selector, payer, REF));
        s.settle(REF, r, m);
        vm.stopPrank();
    }

    function test_sameReferenceIsFreeForAnotherPayer() public {
        address other = makeAddr("other");
        usdc.mint(other, 10);
        vm.prank(other);
        usdc.approve(address(s), 10);
        (address[] memory r, uint256[] memory m) = _legs(1, 1);
        vm.prank(payer);
        s.settle(REF, r, m);
        vm.prank(other);
        s.settle(REF, r, m);
        assertTrue(s.settled(other, REF));
    }

    function test_allOrNothing_failedLegRollsBackEarlierLegsAndReference() public {
        (address[] memory r, uint256[] memory m) = _legs(500_000, 20_000_000); // second leg exceeds balance
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(TidrelSettler.TransferFailed.selector, 1)); // bubbled as revert
        // the mock reverts with a string, which _pull reports as a failed transfer
        s.settle(REF, r, m);
        assertEq(usdc.balanceOf(a), 0);
        assertEq(usdc.balanceOf(payer), 10_000_000);
        assertFalse(s.settled(payer, REF));
    }

    function test_tokenReturningFalseFails() public {
        TidrelSettler bad = new TidrelSettler(IERC20(address(new FalseUSDC())));
        (address[] memory r, uint256[] memory m) = _legs(1, 1);
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(TidrelSettler.TransferFailed.selector, 0));
        bad.settle(REF, r, m);
    }

    function test_rejectsBadInput() public {
        (address[] memory r, uint256[] memory m) = _legs(1, 1);
        vm.startPrank(payer);
        vm.expectRevert(TidrelSettler.EmptyReference.selector);
        s.settle(bytes32(0), r, m);

        uint256[] memory short = new uint256[](1);
        vm.expectRevert(TidrelSettler.LengthMismatch.selector);
        s.settle(REF, r, short);

        vm.expectRevert(TidrelSettler.NoLegs.selector);
        s.settle(REF, new address[](0), new uint256[](0));

        r[0] = address(0);
        vm.expectRevert(abi.encodeWithSelector(TidrelSettler.ZeroRecipient.selector, 0));
        s.settle(REF, r, m);

        (r, m) = _legs(0, 1);
        vm.expectRevert(abi.encodeWithSelector(TidrelSettler.ZeroAmount.selector, 0));
        s.settle(REF, r, m);

        address[] memory big = new address[](51);
        uint256[] memory amt = new uint256[](51);
        vm.expectRevert(abi.encodeWithSelector(TidrelSettler.TooManyLegs.selector, 51));
        s.settle(REF, big, amt);
        vm.stopPrank();
    }

    function testFuzz_totalMatchesAndNothingStays(uint96 x, uint96 y) public {
        x = uint96(bound(x, 1, 5_000_000));
        y = uint96(bound(y, 1, 5_000_000));
        (address[] memory r, uint256[] memory m) = _legs(x, y);
        vm.prank(payer);
        s.settle(REF, r, m);
        assertEq(usdc.balanceOf(a) + usdc.balanceOf(b), uint256(x) + uint256(y));
        assertEq(usdc.balanceOf(address(s)), 0);
    }
}
