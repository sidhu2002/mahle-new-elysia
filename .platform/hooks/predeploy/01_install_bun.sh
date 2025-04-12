#!/bin/bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Make Bun available in PATH
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
# Verify installation
~/.bun/bin/bun --version