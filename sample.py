# AI Model API Integration with Streaming
import requests
import json

def chat_with_model_stream(message, endpoint="http://192.168.1.131:1234", conversation_history=None):
    """Send a message to an AI model endpoint with streaming response"""
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Build conversation history
    if conversation_history is None:
        messages = [
            {"role": "user", "content": "Hi!"},
            {"role": "assistant", "content": "Hello! 🌟 How can I assist you today? 😊"},
            {"role": "user", "content": "What is 1+1?"},
            {"role": "assistant", "content": "1 + 1 = 2 ✅  \n\nSimple and sweet! 😊  \nIs there anything else you'd like to explore? 🚀"},
            {"role": "user", "content": message}
        ]
    else:
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant."},
            *conversation_history,
            {"role": "user", "content": message}
        ]
    
    payload = {
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 0.9,
        "stream": True
    }
    
    try:
        response = requests.post(f"{endpoint}/v1/chat/completions", 
                               headers=headers, json=payload, timeout=30, stream=True)
        response.raise_for_status()
        
        print("AI Response: ", end="", flush=True)
        
        ai_response = ""
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data.strip() == '[DONE]':
                        break
                    try:
                        parsed = json.loads(data)
                        if 'choices' in parsed and len(parsed['choices']) > 0:
                            delta = parsed['choices'][0].get('delta', {})
                            if 'content' in delta:
                                content = delta['content']
                                print(content, end="", flush=True)
                                ai_response += content
                    except json.JSONDecodeError:
                        continue
        
        print()  # New line after streaming
        return ai_response
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Error: {e}")

def chat_with_model(message, endpoint="http://192.168.1.141:1234"):
    """Send a message to an AI model endpoint (non-streaming)"""
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Build conversation history
    messages = [
            {"role": "user", "content": "Hi!"},
            {"role": "assistant", "content": "Hello! 🌟 How can I assist you today? 😊"},
            {"role": "user", "content": "What is 1+1?"},
            {"role": "assistant", "content": "1 + 1 = 2 ✅  \n\nSimple and sweet! 😊  \nIs there anything else you'd like to explore? 🚀"},
        {"role": "user", "content": message}
    ]
    
    payload = {
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 0.9,
        "stream": False
    }
    
    try:
        response = requests.post(f"{endpoint}/v1/chat/completions", 
                               headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        return f"Error: {e}"
    except KeyError as e:
        return f"Error: Unexpected response format - {e}"
    except Exception as e:
        return f"Error: {e}"

# Interactive chat loop
def interactive_chat(endpoint="http://192.168.1.141:1234"):
    """Interactive chat loop - type 'quit' to exit"""
    print("🤖 AI Chat Assistant")
    print("Type 'quit' to exit the chat")
    print("-" * 40)
    
    conversation_history = []
    
    while True:
        try:
            # Get user input
            user_input = input("\nYou: ").strip()
            
            # Check for quit command
            if user_input.lower() in ['quit', 'exit', 'bye', 'goodbye']:
                print("👋 Goodbye! Thanks for chatting!")
                break
            
            if not user_input:
                print("Please enter a message or type 'quit' to exit.")
                continue
            
            # Add user message to conversation
            conversation_history.append({"role": "user", "content": user_input})
            
            # Get AI response with streaming
            print("\nAI: ", end="", flush=True)
            ai_response = chat_with_model_stream(user_input, endpoint, conversation_history)
            
            # Add AI response to conversation history
            if ai_response:
                conversation_history.append({"role": "assistant", "content": ai_response})
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye! Thanks for chatting!")
            break
        except Exception as e:
            print(f"\nError: {e}")
            print("Please try again or type 'quit' to exit.")

# Example usage
if __name__ == "__main__":
    # Interactive chat loop
    interactive_chat()
    
    # Or single message examples:
    # print("=== Single Message Examples ===")
    # message = "Hello, how can you help me?"
    # chat_with_model_stream(message)
    # response = chat_with_model(message)
    # print(f"AI Response: {response}")
