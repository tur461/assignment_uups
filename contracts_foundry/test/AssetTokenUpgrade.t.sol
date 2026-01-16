// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AssetToken } from "../src/AssetToken.sol";
import { AssetTokenV2 } from "../src/AssetTokenV2.sol";

contract AssetTokenUpgradeTest is Test {
    AssetToken token;
    address admin = address(1);
    address user = address(2);

    function setUp() public {
        vm.startPrank(admin);

        AssetToken impl = new AssetToken();

        bytes memory data = abi.encodeCall(
            AssetToken.initialize,
            ("Asset Token", "AST", 1_000_000 ether, admin)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        token = AssetToken(address(proxy));

        vm.stopPrank();
    }

    function testUpgradeLifecycle() public {
        vm.prank(admin);
        token.mint(user, 100 ether);

        assertEq(token.balanceOf(user), 100 ether);

        // lets deploy V2
        AssetTokenV2 implV2 = new AssetTokenV2();

        vm.prank(admin);
        token.upgradeToAndCall(
            address(implV2),
            abi.encodeCall(AssetTokenV2.initializeV2, ())
        );

        assertEq(token.balanceOf(user), 100 ether);

        vm.prank(admin);
        AssetTokenV2(address(token)).pause();

        vm.prank(user);
        vm.expectRevert(bytes("Pausable: paused"));

        (bool success, ) = address(token).call(
            abi.encodeCall(
                IERC20.transfer,
                (admin, 10 ether)
            )
        );

        assertFalse(success);
    }
}

