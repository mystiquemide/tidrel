import { parseAbi } from 'viem'

export const memoAbi = parseAbi([
  'function memo(address target, bytes data, bytes32 memoId, bytes memoData)',
  'event BeforeMemo(uint256 indexed memoIndex)',
  'event Memo(address indexed sender, address indexed target, bytes32 callDataHash, bytes32 indexed memoId, bytes memo, uint256 memoIndex)',
])

export const multicall3FromAbi = parseAbi([
  'struct Call3 { address target; bool allowFailure; bytes callData; }',
  'struct Result { bool success; bytes returnData; }',
  'function aggregate3(Call3[] calls) payable returns (Result[] returnData)',
])

export const erc20Abi = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
])

export const morphoAbi = parseAbi([
  'event Borrow(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets, uint256 shares)',
  'event Repay(bytes32 indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares)',
  'function position(bytes32 id, address user) view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)',
])

export const settlerAbi = parseAbi([
  'function settle(bytes32 ref, address[] recipients, uint256[] amounts)',
  'function settled(address payer, bytes32 ref) view returns (bool)',
  'event Settled(address indexed payer, bytes32 indexed ref, uint256 total, uint256 legs)',
  'event Leg(address indexed payer, bytes32 indexed ref, address indexed to, uint256 amount)',
  'error ReferenceUsed(address payer, bytes32 ref)',
])

export const erc20ApproveAbi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)'])
