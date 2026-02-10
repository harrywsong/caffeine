#!/bin/bash

echo "🛑 Disabling AI features..."
echo "================================================"

# Stop Ollama service
echo "⏹️  Stopping Ollama service..."
sudo systemctl stop ollama
sudo systemctl disable ollama

# Remove Ollama (optional)
read -p "Do you want to completely remove Ollama? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing Ollama..."
    sudo rm -rf /usr/local/bin/ollama
    sudo rm -rf /usr/share/ollama
    sudo rm -rf ~/.ollama
    sudo systemctl daemon-reload
    echo "✅ Ollama removed"
fi

# Disable web search in bot
echo "🔧 Disabling web search in bot..."
if grep -q "ENABLE_WEB_SEARCH" .env; then
    sed -i 's/ENABLE_WEB_SEARCH=.*/ENABLE_WEB_SEARCH=false/' .env
else
    echo "ENABLE_WEB_SEARCH=false" >> .env
fi

# Rename AI event handler to disable it
if [ -f "src/events/aiChat.js" ]; then
    echo "📝 Disabling AI chat handler..."
    mv src/events/aiChat.js src/events/aiChat.js.disabled
    echo "✅ AI chat handler disabled"
fi

# Restart bot
echo "🔄 Restarting bot..."
pm2 restart caffeinebot

echo ""
echo "================================================"
echo "✅ AI features disabled!"
echo ""
echo "📊 Freed resources:"
free -h
echo ""
echo "💡 To re-enable later:"
echo "   1. Enable Ollama: sudo systemctl start ollama"
echo "   2. Enable web search: Set ENABLE_WEB_SEARCH=true in .env"
echo "   3. Enable AI chat: mv src/events/aiChat.js.disabled src/events/aiChat.js"
echo "   4. Restart bot: pm2 restart caffeinebot"
echo ""
