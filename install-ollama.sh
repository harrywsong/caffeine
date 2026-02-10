#!/bin/bash

# Ollama Installation Script for Oracle Cloud Ubuntu Instance
# This script installs Ollama and sets up a lightweight AI model

echo "🤖 Installing Ollama on Oracle Cloud Instance..."
echo "================================================"

# Check system resources
echo ""
echo "📊 Checking system resources..."
free -h
df -h /

echo ""
echo "⚠️  WARNING: Ollama requires significant resources."
echo "    Recommended: 4GB+ RAM, 10GB+ free disk space"
echo ""
read -p "Continue with installation? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# Install Ollama
echo ""
echo "📥 Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Check if installation was successful
if ! command -v ollama &> /dev/null
then
    echo "❌ Ollama installation failed"
    exit 1
fi

echo "✅ Ollama installed successfully!"

# Start Ollama service
echo ""
echo "🚀 Starting Ollama service..."
sudo systemctl start ollama
sudo systemctl enable ollama

# Wait for service to start
sleep 5

# Pull a lightweight model
echo ""
echo "📦 Downloading AI model..."
echo "   Using llama3.2:3b (smaller, faster model - ~2GB)"
echo "   This may take several minutes..."
ollama pull llama3.2:3b

# Verify model is available
echo ""
echo "✅ Checking installed models..."
ollama list

# Test the model
echo ""
echo "🧪 Testing model with a simple prompt..."
echo "   Prompt: 'Say hello in one sentence'"
ollama run llama3.2:3b "Say hello in one sentence"

echo ""
echo "================================================"
echo "✅ Ollama installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update your .env file with AI_CHANNEL_ID"
echo "   2. Restart your Discord bot"
echo "   3. Test in the designated AI channel"
echo ""
echo "🔧 Useful commands:"
echo "   - List models: ollama list"
echo "   - Pull new model: ollama pull <model-name>"
echo "   - Test model: ollama run llama3.2:3b 'your prompt'"
echo "   - Check service: sudo systemctl status ollama"
echo ""
echo "💡 Recommended models for your instance:"
echo "   - llama3.2:3b (2GB) - Fast, good quality"
echo "   - phi3:mini (2.3GB) - Very fast, decent quality"
echo "   - gemma2:2b (1.6GB) - Fastest, lighter quality"
echo ""
