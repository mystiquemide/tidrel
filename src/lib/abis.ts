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
])
