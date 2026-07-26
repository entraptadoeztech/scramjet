#!/usr/bin/env bash
set -euxo pipefail

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs/ | sh -s -- -y
source "$HOME/.cargo/env"
rustup toolchain install nightly --component rust-src --target wasm32-unknown-unknown
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
curl -fsSL https://get.pnpm.io/install.sh | sh -
pnpm install --frozen-lockfile
cargo install wasm-bindgen-cli --version 0.2.105 --locked
VER=$(curl --silent -qI https://github.com/WebAssembly/binaryen/releases/latest | awk -F '/' '/^location/ {print  substr($NF, 1, length($NF)-1)}'); \
curl -LO https://github.com/WebAssembly/binaryen/releases/download/$VER/binaryen-$%7BVER%7D-x86_64-linux.tar.gz
tar xvf binaryen-${VER}-x86_64-linux.tar.gz
rm -f binaryen-${VER}-x86_64-linux.tar.gz
mkdir -p "$HOME/.local/bin" "$HOME/.local/lib"
mv binaryen-${VER}/bin/* ~/.local/bin
mv binaryen-${VER}/lib/* ~/.local/lib
rm -rf binaryen-${VER}
cargo install --git https://github.com/r58playz/wasm-snip --locked
cd packages/core/
pnpm rewriter:build
pnpm build
cd ../../
