// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import { Script, console2 } from "forge-std/Script.sol";
import { AssetTokenV2 } from "../src/AssetTokenV2.sol";

interface IUUPS {
    function upgradeToAndCall(address newImpl, bytes calldata data) external;
}

contract UpgradeToV2 is Script {
    function run() external {
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");

        vm.startBroadcast();

        AssetTokenV2 newImpl = new AssetTokenV2();

        IUUPS(proxyAddress).upgradeToAndCall(
            address(newImpl),
            abi.encodeCall(AssetTokenV2.initializeV2, ())
        );

        vm.stopBroadcast();

        console2.log("Upgraded proxy:", proxyAddress);
        console2.log("New implementation:", address(newImpl));
    }
}

