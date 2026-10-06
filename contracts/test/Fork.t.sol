// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {TidrelSettler, IERC20} from "../src/TidrelSettler.sol";

interface IUSDC is IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
}

/// Runs only against an Arc mainnet fork: forge test --match-contract Fork --fork-url <rpc>
contract ForkTest is Test {
    IUSDC constant USDC = IUSDC(0x3600000000000000000000000000000000000000);
    address constant DESK = 0x100E8AF5Ba507641Bb87c7D3229B8d458b78ca04;

    function test_settlesRealUsdcOnArc() public {
        if (block.chainid != 5042) return;
        TidrelSettler s = new TidrelSettler(USDC);
        address r1 = makeAddr("r1");
        address r2 = makeAddr("r2");
        address[] memory r = new address[](2);
        uint256[] memory m = new uint256[](2);
        r[0] = r1; r[1] = r2; m[0] = 500_000; m[1] = 400_000;
        uint256 before = USDC.balanceOf(DESK);
        vm.startPrank(DESK);
        USDC.approve(address(s), 900_000);
        s.settle(bytes32("FORK-1"), r, m);
        vm.stopPrank();
        assertEq(USDC.balanceOf(r1), 500_000);
        assertEq(USDC.balanceOf(r2), 400_000);
        assertEq(before - USDC.balanceOf(DESK), 900_000);
        assertEq(USDC.balanceOf(address(s)), 0);
    }
}
