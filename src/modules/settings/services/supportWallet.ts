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

/** Calls `onChange` with the connected address, or undefined once disconnected. */
export async function watchWallet(onChange: (address: string | undefined) => void) {
  const modal = await getModal()
  return modal.subscribeAccount((account) => onChange(account.address))
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
