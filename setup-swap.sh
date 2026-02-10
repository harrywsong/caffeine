#!/bin/bash

# Setup Swap for Ollama on Oracle Cloud
# This creates a 10GB swap file to allow Ollama to run with limited RAM

echo "🔧 Setting up 10GB swap space for Ollama..."
echo "================================================"

# Check current memory
echo ""
echo "📊 Current memory status:"
free -h

# Check if swap already exists
if [ $(swapon --show | wc -l) -gt 0 ]; then
    echo ""
    echo "⚠️  Swap already exists:"
    swapon --show
    echo ""
    read -p "Do you want to remove existing swap and create new one? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing swap..."
        sudo swapoff -a
        sudo rm -f /swapfile
    else
        echo "❌ Cancelled"
        exit 0
    fi
fi

# Create 10GB swap file
echo ""
echo "📝 Creating 10GB swap file (this may take a few minutes)..."
sudo fallocate -l 10G /swapfile

# Set correct permissions
echo "🔒 Setting permissions..."
sudo chmod 600 /swapfile

# Make it a swap file
echo "⚙️  Formatting as swap..."
sudo mkswap /swapfile

# Enable swap
echo "✅ Enabling swap..."
sudo swapon /swapfile

# Make it permanent (survive reboots)
echo "💾 Making swap permanent..."
if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Optimize swap settings for better performance
echo "⚡ Optimizing swap settings..."
sudo sysctl vm.swappiness=10
sudo sysctl vm.vfs_cache_pressure=50

# Make swap settings permanent
if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
fi
if ! grep -q 'vm.vfs_cache_pressure' /etc/sysctl.conf; then
    echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
fi

# Verify swap is active
echo ""
echo "================================================"
echo "✅ Swap setup complete!"
echo ""
echo "📊 New memory status:"
free -h
echo ""
echo "💾 Swap details:"
swapon --show
echo ""
echo "🔄 Next steps:"
echo "   1. Restart Ollama: sudo systemctl restart ollama"
echo "   2. Restart bot: pm2 restart caffeinebot"
echo "   3. Test in Discord AI channel"
echo ""
echo "⚠️  Note: Swap is slower than RAM. First responses may take 30-60 seconds."
echo "    Subsequent responses will be faster as the model stays in memory."
echo ""
