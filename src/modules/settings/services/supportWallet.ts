import { SUPPORT_ADDRESS, SUPPORT_TOKEN_CONTRACT, SUPPORT_WALLET_PROJECT_ID } from "../constants"

/** Fixed `transfer` ABI of an ERC20/BEP20 token. */
const TOKEN_ABI = ["function transfer(address to, uint256 amount) returns (bool)"]
const TOKEN_DECIMALS = 18

type AppKit = Awaited<ReturnType<typeof createModal>>

let modalPromise: Promise<AppKit> | null = null

/**
 * Wallet picker (WalletConnect/Reown). Loaded on first use only: the library and
 * ethers are large and almost nobody opens the support dialog.
 */
async function createModal() {
  const [{ createAppKit }, { EthersAdapter }, { bsc }] = await Promise.all([
    import("@reown/appkit"),
    import("@reown/appkit-adapter-ethers"),
    import("@reown/appkit/networks"),
  ])
  return createAppKit({
    adapters: [new EthersAdapter()],
    networks: [bsc],
    defaultNetwork: bsc,
    projectId: SUPPORT_WALLET_PROJECT_ID,
    metadata: {
      name: "Invictus",
      description: "Football tournament simulator",
      url: window.location.origin,
      icons: [`${window.location.origin}/logo/invictus-logo.webp`],
    },
    features: { analytics: false, email: false, socials: false },
  })
}

function getModal(): Promise<AppKit> {
  modalPromise ??= createModal()
  return modalPromise
}

export const walletSendEnabled = SUPPORT_WALLET_PROJECT_ID !== ""

export async function openWalletPicker() {
  await (await getModal()).open()
}

/**
 * Calls `onChange` with the connected address, or undefined once disconnected.
 * Pinned to eip155: without a namespace AppKit listens to the top-level chain state,
 * which misses the account change of a fresh connect (the UI only caught up on reload).
 */
export async function watchWallet(onChange: (address: string | undefined) => void) {
  const modal = await getModal()
  return modal.subscribeAccount((account) => onChange(account.address), "eip155")
}

/** The connected address right now, read directly instead of waiting for a subscription tick. */
export async function readWalletAddress(): Promise<string | undefined> {
  return (await getModal()).getAccount("eip155")?.address
}

/** Calls `onClose` each time the wallet picker goes from open to closed. */
export async function watchPicker(onClose: () => void) {
  const modal = await getModal()
  let wasOpen = false
  return modal.subscribeState((state) => {
    if (wasOpen && !state.open) onClose()
    wasOpen = state.open
  })
}

export type SendFailure = "rejected" | "no-wallet" | "other"

/** Buckets a failed send for analytics: the user said no, nothing is connected, or anything else. */
export function classifySendError(error: unknown): SendFailure {
  if (error instanceof Error && error.message === "no-wallet") return "no-wallet"
  const e = error as { code?: unknown; info?: { error?: { code?: unknown } } } | null
  const code = e?.code ?? e?.info?.error?.code
  if (code === "ACTION_REJECTED" || code === 4001) return "rejected"
  return "other"
}

/** Sends `amount` USDT (decimal string) from the connected wallet to SUPPORT_ADDRESS. */
export async function sendSupport(amount: string): Promise<string> {
  const modal = await getModal()
  const provider = modal.getProvider("eip155")
  if (!provider) throw new Error("no-wallet")

  const { BrowserProvider, Contract, parseUnits } = await import("ethers")
  const signer = await new BrowserProvider(provider as never).getSigner()
  const token = new Contract(SUPPORT_TOKEN_CONTRACT, TOKEN_ABI, signer)
  const tx = await token.transfer(SUPPORT_ADDRESS, parseUnits(amount, TOKEN_DECIMALS))
  return tx.hash as string
}
