// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import { AssetToken } from "./AssetToken.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract AssetTokenV2 is AssetToken, PausableUpgradeable {
    function initializeV2() external reinitializer(2) {
        __Pausable_init();
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        super._update(from, to, value);
    }
}

