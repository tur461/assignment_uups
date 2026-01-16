// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import { Script, console2 } from "forge-std/Script.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import { AssetToken } from "../src/AssetToken.sol";

contract DeployAssetToken is Script {
    function run() external {
        address admin = msg.sender;

        vm.startBroadcast();

        AssetToken implementation = new AssetToken();

        bytes memory initData = abi.encodeCall(
            AssetToken.initialize,
            (
                "Asset Token",
                "AST",
                1_000_000 ether,
                admin
            )
        );

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );

        vm.stopBroadcast();

        console2.log("AssetToken Implementation:", address(implementation));
        console2.log("AssetToken Proxy:", address(proxy));
        console2.log("Admin:", admin);
    }
}

