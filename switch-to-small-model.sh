#!/bin/bash

# Switch to a smaller Ollama model that fits in limited RAM

echo "🤖 Switching to smaller AI model..."
echo "================================================"

echo ""
echo "📊 Current memory:"
free -h

echo ""
echo "Available small models:"
echo "  1. gemma2:2b    (1.6GB) - Fastest, good quality"
echo "  2. phi3:mini    (2.3GB) - Requires swap"
echo "  3. qwen2:1.5b   (1.0GB) - Very fast, lighter quality"
echo ""

read -p "Which model do you want? (1/2/3): " choice

case $choice in
    1)
        MODEL="gemma2:2b"
        ;;
    2)
        MODEL="phi3:mini"
        echo "⚠️  This model requires swap memory!"
        ;;
    3)
        MODEL="qwen2:1.5b"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📥 Pulling model: $MODEL"
echo "This may take several minutes..."
ollama pull $MODEL

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Model downloaded successfully!"
    echo ""
    echo "📝 Updating .env file..."
    
    # Update .env file
    if grep -q "OLLAMA_MODEL" .env; then
        sed -i "s/OLLAMA_MODEL=.*/OLLAMA_MODEL=$MODEL/" .env
    else
        echo "OLLAMA_MODEL=$MODEL" >> .env
    fi
    
    echo "✅ .env updated with OLLAMA_MODEL=$MODEL"
    echo ""
    echo "🔄 Restart your bot to use the new model:"
    echo "   pm2 restart caffeinebot"
    echo ""
    echo "🧪 Test the model:"
    echo "   ollama run $MODEL 'Hello, how are you?'"
else
    echo "❌ Failed to download model"
    exit 1
fi
