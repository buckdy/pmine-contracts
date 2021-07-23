//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library Call {
  function loadAddress(bytes memory sig, uint256 idx) public pure returns (address) {
    address influencer;
    idx += 20;
    assembly {
      influencer := mload(add(sig, idx))
    }
    return influencer;
  }

  function loadUint8(bytes memory sig, uint256 idx) public pure returns (uint8) {
    uint8 weight;
    idx += 1;
    assembly {
      weight := mload(add(sig, idx))
    }
    return weight;
  }

  function recoverHash(
    bytes32 hash,
    bytes memory sig,
    uint256 idx
  ) public pure returns (address) {
    // same as recoverHash in utils/sign.js
    // The signature format is a compact form of:
    // {bytes32 r}{bytes32 s}{uint8 v}
    // Compact means, uint8 is not padded to 32 bytes.
    require(sig.length >= 65 + idx, "bad signature length");
    idx += 32;
    bytes32 r;
    assembly {
      r := mload(add(sig, idx))
    }

    idx += 32;
    bytes32 s;
    assembly {
      s := mload(add(sig, idx))
    }

    idx += 1;
    uint8 v;
    assembly {
      v := mload(add(sig, idx))
    }
    if (v >= 32) {
      // handle case when signature was made with ethereum web3.eth.sign or getSign which is for signing ethereum transactions
      v -= 32;
      bytes memory prefix = "\x19Ethereum Signed Message:\n32"; // 32 is the number of bytes in the following hash
      hash = keccak256(abi.encodePacked(prefix, hash));
    }
    if (v <= 1) v += 27;
    require(v == 27 || v == 28, "bad sig v");
    //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/cryptography/ECDSA.sol#L57
    require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "bad sig s");
    return ecrecover(hash, v, r, s);
  }

  function recoverSigMemory(bytes memory sig)
    private
    pure
    returns (
      address[] memory,
      address[] memory,
      uint8[] memory,
      uint256[] memory,
      uint256
    )
  {
    uint8 version = loadUint8(sig, 0);
    uint256 msgLen = (version == 1) ? (1 + 65 + 20) : (1 + 20 + 20);
    uint256 nInfluencers = (sig.length - 21) / (65 + msgLen);
    uint8[] memory weights = new uint8[](nInfluencers);
    address[] memory keys = new address[](nInfluencers);
    if ((sig.length - 21) % (65 + msgLen) > 0) {
      nInfluencers++;
    }
    address[] memory influencers = new address[](nInfluencers);
    uint256[] memory offsets = new uint256[](nInfluencers);

    return (influencers, keys, weights, offsets, msgLen);
  }

  function recoverSigParts(bytes memory sig, address lastAddress)
    private
    pure
    returns (
      address[] memory,
      address[] memory,
      uint8[] memory,
      uint256[] memory
    )
  {
    // sig structure:
    // 1 byte version 0 or 1
    // 20 bytes are the address of the contractor or the influencer who created sig.
    // this is the "anchor" of the link
    // It must have a public key aleady stored for it in public_link_key
    // Begining of a loop on steps in the link:
    // * 65 bytes are step-signature using the secret from previous step
    // * message of the step that is going to be hashed and used to compute the above step-signature.
    //   message length depend on version 41 (version 0) or 86 (version 1):
    // * 1 byte cut (percentage) each influencer takes from the bounty. the cut is stored in influencer2cut or weight for voting
    // * 20 bytes address of influencer (version 0) or 65 bytes of signature of cut using the influencer address to sign
    // * 20 bytes public key of the last secret
    // In the last step the message can be optional. If it is missing the message used is the address of the sender
    uint256 idx = 0;
    uint256 msgLen;
    uint8[] memory weights;
    address[] memory keys;
    address[] memory influencers;
    uint256[] memory offsets;
    (influencers, keys, weights, offsets, msgLen) = recoverSigMemory(sig);
    idx += 1; // skip version

    idx += 20; // skip old_address which should be read by the caller in order to get oldKey
    uint256 countInfluencers = 0;

    while (idx + 65 <= sig.length) {
      offsets[countInfluencers] = idx;
      idx += 65; // idx was increased by 65 for the signature at the begining which we will process later

      if (idx + msgLen <= sig.length) {
        // its  a < and not a <= because we dont want this to be the final iteration for the converter
        weights[countInfluencers] = loadUint8(sig, idx);
        require(weights[countInfluencers] > 0, "weight not defined (1..255)"); // 255 are used to indicate default (equal part) behaviour
        idx++;

        if (msgLen == 41) // 1 + 20 + 20 version 0
        {
          influencers[countInfluencers] = loadAddress(sig, idx);
          idx += 20;
          keys[countInfluencers] = loadAddress(sig, idx);
          idx += 20;
        } else if (msgLen == 86) // 1 + 65 + 20 version 1
        {
          keys[countInfluencers] = loadAddress(sig, idx + 65);
          influencers[countInfluencers] = recoverHash(
            keccak256(
              abi.encodePacked(
                keccak256(abi.encodePacked("bytes binding to weight", "bytes binding to public")),
                keccak256(abi.encodePacked(weights[countInfluencers], keys[countInfluencers]))
              )
            ),
            sig,
            idx
          );
          idx += 65;
          idx += 20;
        }
      } else {
        // handle short signatures generated with free_take
        influencers[countInfluencers] = lastAddress;
      }
      countInfluencers++;
    }
    require(idx == sig.length, "illegal message size");

    return (influencers, keys, weights, offsets);
  }

  function recoverSig(
    bytes memory sig,
    address oldKey,
    address lastAddress
  )
    public
    pure
    returns (
      address[] memory,
      address[] memory,
      uint8[] memory
    )
  {
    // validate sig AND
    // recover the information from the signature: influencers, public_link_keys, weights/cuts
    // influencers may have one more address than the keys and weights arrays
    //
    require(oldKey != address(0), "no public link key");

    address[] memory influencers;
    address[] memory keys;
    uint8[] memory weights;
    uint256[] memory offsets;
    (influencers, keys, weights, offsets) = recoverSigParts(sig, lastAddress);

    // check if we received a valid signature
    for (uint256 i = 0; i < influencers.length; i++) {
      if (i < weights.length) {
        require(
          recoverHash(keccak256(abi.encodePacked(weights[i], keys[i], influencers[i])), sig, offsets[i]) == oldKey,
          "illegal signature"
        );
        oldKey = keys[i];
      } else {
        // signed message for the last step is the address of the converter
        require(
          recoverHash(keccak256(abi.encodePacked(influencers[i])), sig, offsets[i]) == oldKey,
          "illegal last signature"
        );
      }
    }

    return (influencers, keys, weights);
  }
}
