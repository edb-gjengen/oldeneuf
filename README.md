# Oldeneuf

App for checking BankID ID card QR codes using the [Stø ID Card API](https://developer.idcard.stoe.no/).

## Development

[mise](https://mise.jdx.dev/) is used for tool management. Install Node.js and dependencies:

```bash
mise trust
mise install
npm install
```

Run the development server:

```bash
npm run dev
```

The camera stream is only accessible in a secure context. Test via a Cloudflare Tunnel:

```bash
npm run tunnel
```
