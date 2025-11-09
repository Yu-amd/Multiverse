import React, { useState } from 'react';
import type { Message } from '../types';

interface CodePanelProps {
  messages: Message[];
  inputMessage: string;
  customEndpoint: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onOpenApiInfo: () => void;
}

export const CodePanel: React.FC<CodePanelProps> = ({
  messages,
  inputMessage,
  customEndpoint,
  apiKey,
  temperature,
  maxTokens,
  topP,
  showToast,
  onOpenApiInfo
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'python' | 'javascript' | 'curl' | 'rust'>('python');

  const getPythonCode = () => {
    const endpoint = customEndpoint;
    
    const cleanMessages = messages.filter((msg: Message) => msg.content.trim() !== '');
    const conversationHistory = cleanMessages.map((msg: Message) => 
      `            {"role": "${msg.role}", "content": ${JSON.stringify(msg.content)}}`
    ).join(',\n');
    
    const currentMessage = inputMessage.trim() || "Hello, how can you help me?";
    
    return `# AI Model API Integration with Streaming
import requests
import json

def chat_with_model_stream(message, endpoint="${endpoint}", conversation_history=None):
    """Send a message to an AI model endpoint with streaming response"""
    
    headers = {
        "Content-Type": "application/json"${apiKey ? `,\n        "Authorization": "Bearer ${apiKey}"` : ''}
    }
    
    # Build conversation history
    if conversation_history is None:
        messages = [
${conversationHistory || '            {"role": "system", "content": "You are a helpful AI assistant."}'},
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
        "temperature": ${temperature},
        "max_tokens": ${maxTokens},
        "top_p": ${topP},
        "stream": True
    }
    
    try:
        response = requests.post(f"{endpoint}/v1/chat/completions", 
                               headers=headers, json=payload, stream=True, timeout=30)
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

def chat_with_model(message, endpoint="${endpoint}"):
    """Send a message to an AI model endpoint (non-streaming)"""
    
    headers = {
        "Content-Type": "application/json"${apiKey ? `,\n        "Authorization": "Bearer ${apiKey}"` : ''}
    }
    
    # Build conversation history
    messages = [
${conversationHistory || '        {"role": "system", "content": "You are a helpful AI assistant."}'},
        {"role": "user", "content": message}
    ]
    
    payload = {
        "messages": messages,
        "temperature": ${temperature},
        "max_tokens": ${maxTokens},
        "top_p": ${topP},
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
def interactive_chat(endpoint="${endpoint}"):
    """Interactive chat loop - type 'quit' to exit"""
    print("🤖 AI Chat Assistant")
    print("Type 'quit' to exit the chat")
    print("-" * 40)
    
    conversation_history = []
    
    while True:
        try:
            # Get user input
            user_input = input("\\nYou: ").strip()
            
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
            print("\\nAI: ", end="", flush=True)
            ai_response = chat_with_model_stream(user_input, endpoint, conversation_history)
            
            # Add AI response to conversation history
            if ai_response:
                conversation_history.append({"role": "assistant", "content": ai_response})
            
        except KeyboardInterrupt:
            print("\\n\\n👋 Goodbye! Thanks for chatting!")
            break
        except Exception as e:
            print(f"\\nError: {e}")
            print("Please try again or type 'quit' to exit.")

# Example usage
if __name__ == "__main__":
    # Interactive chat loop
    interactive_chat()
    
    # Or single message examples:
    # print("=== Single Message Examples ===")
    # message = ${JSON.stringify(currentMessage)}
    # chat_with_model_stream(message)
    # response = chat_with_model(message)
    # print(f"AI Response: {response}")`;
  };

  const getJavaScriptCode = () => {
    const endpoint = customEndpoint;
    
    const cleanMessages = messages.filter((msg: Message) => msg.content.trim() !== '');
    const conversationHistory = cleanMessages.map((msg: Message) => 
      `        { role: "${msg.role}", content: ${JSON.stringify(msg.content)} }`
    ).join(',\n');
    
    const currentMessage = inputMessage.trim() || "Hello, how can you help me?";
    
    return `// AI Model API Integration with Streaming (Node.js)
const fetch = require('node-fetch');

async function chatWithModelStream(message, endpoint = "${endpoint}", conversationHistory = null) {
    const headers = {
        "Content-Type": "application/json"${apiKey ? `,\n        "Authorization": "Bearer ${apiKey}"` : ''}
    };
    
    let messages;
    if (conversationHistory === null) {
        messages = [
${conversationHistory || '            { role: "system", content: "You are a helpful AI assistant." },'}
            { role: "user", content: message }
        ];
    } else {
        messages = [
            { role: "system", content: "You are a helpful AI assistant." },
            ...conversationHistory,
            { role: "user", content: message }
        ];
    }
    
    const payload = {
        messages: messages,
        temperature: ${temperature},
        max_tokens: ${maxTokens},
        top_p: ${topP},
        stream: true
    };
    
    try {
        const response = await fetch(\`\${endpoint}/v1/chat/completions\`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        
        console.log("AI Response: ");
        
        let aiResponse = "";
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data.trim() === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.choices?.[0]?.delta?.content) {
                            const content = parsed.choices[0].delta.content;
                            process.stdout.write(content);
                            aiResponse += content;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
        
        console.log();
        return aiResponse;
        
    } catch (error) {
        console.error(\`Error: \${error.message}\`);
        return null;
    }
}

// Interactive chat loop
const readline = require('readline');

async function interactiveChat(endpoint = "${endpoint}") {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log("🤖 AI Chat Assistant");
    console.log("Type 'quit' or 'exit' to end the chat");
    console.log("-".repeat(40));
    
    const conversationHistory = [];
    
    const askQuestion = () => {
        rl.question("\\nYou: ", async (userInput) => {
            const input = userInput.trim();
            
            if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
                console.log("👋 Goodbye! Thanks for chatting!");
                rl.close();
                return;
            }
            
            if (!input) {
                console.log("Please enter a message or type 'quit' to exit.");
                askQuestion();
                return;
            }
            
            // Add user message to history
            conversationHistory.push({ role: "user", content: input });
            
            // Get AI response with streaming
            process.stdout.write("\\nAI: ");
            const aiResponse = await chatWithModelStream(input, endpoint, conversationHistory);
            
            // Add AI response to history
            if (aiResponse) {
                conversationHistory.push({ role: "assistant", content: aiResponse });
            }
            
            // Continue the loop
            askQuestion();
        });
    };
    
    askQuestion();
}

// Example usage
if (require.main === module) {
    // Start interactive chat loop
    interactiveChat();
    
    // Or single message example:
    // const message = ${JSON.stringify(currentMessage)};
    // chatWithModelStream(message).then(response => {
    //     console.log("\\nComplete response received");
    // });
}`;
  };

  const getCurlCode = () => {
    const endpoint = customEndpoint;
    
    const cleanMessages = messages.filter((msg: Message) => msg.content.trim() !== '');
    const conversationHistory = cleanMessages.map((msg: Message) => 
      `      {"role": "${msg.role}", "content": ${JSON.stringify(msg.content)}}`
    ).join(',\\n');
    
    const currentMessage = inputMessage.trim() || "Hello, how can you help me?";
    
    return `# AI Model API Integration with cURL - Chat Loop Example

#!/bin/bash

# Chat loop script - continues until user types 'quit' or 'exit'
ENDPOINT="${endpoint}"
CONVERSATION_HISTORY='[${conversationHistory || '{"role": "system", "content": "You are a helpful AI assistant."}'}]'

echo "🤖 AI Chat Assistant"
echo "Type 'quit' or 'exit' to end the chat"
echo "----------------------------------------"

while true; do
    # Get user input
    echo ""
    read -p "You: " USER_INPUT
    
    # Check for quit command
    if [[ "\${USER_INPUT,,}" == "quit" ]] || [[ "\${USER_INPUT,,}" == "exit" ]]; then
        echo "👋 Goodbye! Thanks for chatting!"
        break
    fi
    
    # Skip empty input
    if [ -z "$USER_INPUT" ]; then
        continue
    fi
    
    # Add user message to conversation
    CONVERSATION_HISTORY=$(echo "$CONVERSATION_HISTORY" | jq --arg msg "$USER_INPUT" '. += [{"role": "user", "content": $msg}]')
    
    # Make streaming API request
    echo -n "AI: "
    RESPONSE=$(curl -s -X POST "${'$'}{ENDPOINT}/v1/chat/completions" \\
      -H "Content-Type: application/json"${apiKey ? ` \\\n      -H "Authorization: Bearer ${apiKey}"` : ''} \\
      -d "{
        \\"messages\\": $CONVERSATION_HISTORY,
        \\"temperature\\": ${temperature},
        \\"max_tokens\\": ${maxTokens},
        \\"top_p\\": ${topP},
        \\"stream\\": true
      }" \\
      --no-buffer | while IFS= read -r line; do
        if [[ "$line" == data:* ]]; then
            data="${'$'}{line:6}"
            if [[ "$data" != "[DONE]" ]]; then
                content=$(echo "$data" | jq -r '.choices[0].delta.content // empty' 2>/dev/null)
                if [ -n "$content" ] && [ "$content" != "null" ]; then
                    echo -n "$content"
                    echo -n "$content" >> /tmp/ai_response.txt
                fi
            fi
        fi
    done)
    echo ""
    
    # Add AI response to conversation history
    AI_RESPONSE=$(cat /tmp/ai_response.txt 2>/dev/null || echo "")
    if [ -n "$AI_RESPONSE" ]; then
        CONVERSATION_HISTORY=$(echo "$CONVERSATION_HISTORY" | jq --arg msg "$AI_RESPONSE" '. += [{"role": "assistant", "content": $msg}]')
        rm -f /tmp/ai_response.txt
    fi
done

# Single request example (non-loop):
# curl -X POST "${endpoint}/v1/chat/completions" \\
#   -H "Content-Type: application/json"${apiKey ? ` \\\n#   -H "Authorization: Bearer ${apiKey}"` : ''} \\
#   -d '{
#     "messages": [
#${conversationHistory || '       {"role": "system", "content": "You are a helpful AI assistant."},'}
#       {"role": "user", "content": ${JSON.stringify(currentMessage)}}
#     ],
#     "temperature": ${temperature},
#     "max_tokens": ${maxTokens},
#     "top_p": ${topP},
#     "stream": true
#   }' \\
#   --no-buffer`;
  };

  const getRustCode = () => {
    const endpoint = customEndpoint;
    
    const cleanMessages = messages.filter((msg: Message) => msg.content.trim() !== '');
    const conversationHistory = cleanMessages.map((msg: Message) => 
      `        Message { role: "${msg.role}".to_string(), content: ${JSON.stringify(msg.content)}.to_string() }`
    ).join(',\n');
    
    const currentMessage = inputMessage.trim() || "Hello, how can you help me?";
    
    return `// AI Model API Integration with Streaming (Rust)
use reqwest;
use serde::{Deserialize, Serialize};
use tokio_stream::StreamExt;

#[derive(Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    messages: Vec<Message>,
    temperature: f64,
    max_tokens: i32,
    top_p: f64,
    stream: bool,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    delta: Delta,
}

#[derive(Deserialize)]
struct Delta {
    content: Option<String>,
}

async fn chat_with_model_stream(
    message: &str,
    endpoint: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Content-Type", "application/json".parse()?);${apiKey ? `\n    headers.insert("Authorization", format!("Bearer ${apiKey}").parse()?);` : ''}
    
    let messages = vec![
        Message {
            role: "system".to_string(),
            content: "You are a helpful AI assistant.".to_string(),
        },
${conversationHistory || '        Message { role: "user".to_string(), content: message.to_string() }'}
    ];
    
    let request = ChatRequest {
        messages,
        temperature: ${temperature},
        max_tokens: ${maxTokens},
        top_p: ${topP},
        stream: true,
    };
    
    let client = reqwest::Client::new();
    let response = client
        .post(&format!("{}/v1/chat/completions", endpoint))
        .headers(headers)
        .json(&request)
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()).into());
    }
    
    print!("AI Response: ");
    
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        let text = String::from_utf8_lossy(&chunk);
        
        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    break;
                }
                
                if let Ok(response) = serde_json::from_str::<ChatResponse>(data) {
                    if let Some(choice) = response.choices.first() {
                        if let Some(content) = &choice.delta.content {
                            print!("{}", content);
                        }
                    }
                }
            }
        }
    }
    
    println!();
    Ok(())
}

// Interactive chat loop
async fn interactive_chat(endpoint: &str) -> Result<(), Box<dyn std::error::Error>> {
    use std::io::{self, Write};
    
    println!("🤖 AI Chat Assistant");
    println!("Type 'quit' or 'exit' to end the chat");
    println!("{}", "-".repeat(40));
    
    let mut conversation_history: Vec<Message> = vec![
        Message {
            role: "system".to_string(),
            content: "You are a helpful AI assistant.".to_string(),
        }
    ];
    
    loop {
        // Get user input
        print!("\\nYou: ");
        io::stdout().flush()?;
        
        let mut user_input = String::new();
        io::stdin().read_line(&mut user_input)?;
        let user_input = user_input.trim();
        
        // Check for quit command
        if user_input.to_lowercase() == "quit" || user_input.to_lowercase() == "exit" {
            println!("👋 Goodbye! Thanks for chatting!");
            break;
        }
        
        // Skip empty input
        if user_input.is_empty() {
            continue;
        }
        
        // Add user message to history
        conversation_history.push(Message {
            role: "user".to_string(),
            content: user_input.to_string(),
        });
        
        // Get AI response with streaming
        print!("\\nAI: ");
        io::stdout().flush()?;
        
        let ai_response = chat_with_model_stream_history(
            &conversation_history,
            endpoint
        ).await?;
        
        // Add AI response to history
        conversation_history.push(Message {
            role: "assistant".to_string(),
            content: ai_response,
        });
    }
    
    Ok(())
}

async fn chat_with_model_stream_history(
    conversation_history: &Vec<Message>,
    endpoint: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Content-Type", "application/json".parse()?);${apiKey ? `\n    headers.insert("Authorization", format!("Bearer ${apiKey}").parse()?);` : ''}
    
    let request = ChatRequest {
        messages: conversation_history.clone(),
        temperature: ${temperature},
        max_tokens: ${maxTokens},
        top_p: ${topP},
        stream: true,
    };
    
    let client = reqwest::Client::new();
    let response = client
        .post(&format!("{}/v1/chat/completions", endpoint))
        .headers(headers)
        .json(&request)
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()).into());
    }
    
    let mut full_response = String::new();
    let mut stream = response.bytes_stream();
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        let text = String::from_utf8_lossy(&chunk);
        
        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    break;
                }
                
                if let Ok(response) = serde_json::from_str::<ChatResponse>(data) {
                    if let Some(choice) = response.choices.first() {
                        if let Some(content) = &choice.delta.content {
                            print!("{}", content);
                            full_response.push_str(content);
                        }
                    }
                }
            }
        }
    }
    
    println!();
    Ok(full_response)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let endpoint = "${endpoint}";
    
    // Start interactive chat loop
    interactive_chat(endpoint).await?;
    
    // Or single message example:
    // let message = ${JSON.stringify(currentMessage)};
    // chat_with_model_stream(&message, endpoint).await?;
    
    Ok(())
}`;
  };

  const getCurrentCode = () => {
    switch (selectedLanguage) {
      case 'python':
        return getPythonCode();
      case 'javascript':
        return getJavaScriptCode();
      case 'curl':
        return getCurlCode();
      case 'rust':
        return getRustCode();
      default:
        return getPythonCode();
    }
  };

  const getLanguageName = () => {
    switch (selectedLanguage) {
      case 'python':
        return 'python';
      case 'javascript':
        return 'javascript';
      case 'curl':
        return 'bash';
      case 'rust':
        return 'rust';
      default:
        return 'python';
    }
  };

  const highlightCode = (code: string, language: string) => {
    const lines = code.split('\n');
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      
      // Escape HTML first
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      let highlightedLine = '';
      const tokens: Array<{type: string, value: string}> = [];

      if (language === 'python') {
        const remaining = escapedLine;
        
        const commentMatch = remaining.match(/#.*$/);
        if (commentMatch) {
          const beforeComment = remaining.substring(0, commentMatch.index!);
          tokens.push({type: 'code', value: beforeComment});
          tokens.push({type: 'comment', value: commentMatch[0]});
        } else {
          tokens.push({type: 'code', value: remaining});
        }
        
        highlightedLine = tokens.map(token => {
          if (token.type === 'comment') {
            return `<span class="comment">${token.value}</span>`;
          } else {
            let processed = token.value;
            const stringPlaceholders: string[] = [];
            
            processed = processed.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, (match) => {
              stringPlaceholders.push(match);
              return `__STRING_${stringPlaceholders.length - 1}__`;
            });
            
            processed = processed
              .replace(/\b(def|class|import|from|if|else|elif|for|while|try|except|finally|with|as|return|yield|lambda|and|or|not|in|is|True|False|None|async|await|pass|break|continue|raise|assert)\b/g, '<span class="keyword">$1</span>')
              .replace(/\b(self|cls)\b/g, '<span class="self">$1</span>')
              .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
            
            processed = processed.replace(/__STRING_(\d+)__/g, (_, idx) => {
              return `<span class="string">${stringPlaceholders[parseInt(idx)]}</span>`;
            });
            
            return processed;
          }
        }).join('');
        
      } else if (language === 'javascript') {
        const remaining = escapedLine;
        const commentMatch = remaining.match(/\/\/.*$/);
        if (commentMatch) {
          const beforeComment = remaining.substring(0, commentMatch.index!);
          tokens.push({type: 'code', value: beforeComment});
          tokens.push({type: 'comment', value: commentMatch[0]});
        } else {
          tokens.push({type: 'code', value: remaining});
        }
        
        highlightedLine = tokens.map(token => {
          if (token.type === 'comment') {
            return `<span class="comment">${token.value}</span>`;
          } else {
            let processed = token.value;
            const stringPlaceholders: string[] = [];
            
            processed = processed.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, (match) => {
              stringPlaceholders.push(match);
              return `__STRING_${stringPlaceholders.length - 1}__`;
            });
            
            processed = processed
              .replace(/\b(function|const|let|var|if|else|for|while|try|catch|finally|return|async|await|class|extends|import|export|from|default|require|module|new|this|typeof|instanceof)\b/g, '<span class="keyword">$1</span>')
              .replace(/\b(true|false|null|undefined)\b/g, '<span class="keyword">$1</span>')
              .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
            
            processed = processed.replace(/__STRING_(\d+)__/g, (_, idx) => {
              return `<span class="string">${stringPlaceholders[parseInt(idx)]}</span>`;
            });
            
            return processed;
          }
        }).join('');
        
      } else if (language === 'bash') {
        const remaining = escapedLine;
        const commentMatch = remaining.match(/#.*$/);
        if (commentMatch) {
          const beforeComment = remaining.substring(0, commentMatch.index!);
          tokens.push({type: 'code', value: beforeComment});
          tokens.push({type: 'comment', value: commentMatch[0]});
        } else {
          tokens.push({type: 'code', value: remaining});
        }
        
        highlightedLine = tokens.map(token => {
          if (token.type === 'comment') {
            return `<span class="comment">${token.value}</span>`;
          } else {
            let processed = token.value;
            const stringPlaceholders: string[] = [];
            
            processed = processed.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, (match) => {
              stringPlaceholders.push(match);
              return `__STRING_${stringPlaceholders.length - 1}__`;
            });
            
            processed = processed
              .replace(/\b(curl|echo|if|then|else|fi|for|while|do|done|function|return|export|cd|ls|mkdir|rm|cp|mv|grep|awk|sed)\b/g, '<span class="keyword">$1</span>')
              .replace(/(-[a-zA-Z]|--[a-zA-Z-]+)/g, '<span class="flag">$1</span>')
              .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
            
            processed = processed.replace(/__STRING_(\d+)__/g, (_, idx) => {
              return `<span class="string">${stringPlaceholders[parseInt(idx)]}</span>`;
            });
            
            return processed;
          }
        }).join('');
        
      } else if (language === 'rust') {
        const remaining = escapedLine;
        const commentMatch = remaining.match(/\/\/.*$/);
        if (commentMatch) {
          const beforeComment = remaining.substring(0, commentMatch.index!);
          tokens.push({type: 'code', value: beforeComment});
          tokens.push({type: 'comment', value: commentMatch[0]});
        } else {
          tokens.push({type: 'code', value: remaining});
        }
        
        highlightedLine = tokens.map(token => {
          if (token.type === 'comment') {
            return `<span class="comment">${token.value}</span>`;
          } else {
            let processed = token.value;
            const stringPlaceholders: string[] = [];
            
            processed = processed.replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g, (match) => {
              stringPlaceholders.push(match);
              return `__STRING_${stringPlaceholders.length - 1}__`;
            });
            
            processed = processed
              .replace(/\b(fn|let|mut|const|static|if|else|match|for|while|loop|break|continue|return|async|await|struct|enum|impl|trait|use|mod|pub|priv|super|self|Self|true|false|Some|None|Ok|Err|Result|Option|Vec|String|Box|dyn|std)\b/g, '<span class="keyword">$1</span>')
              .replace(/&amp;([a-zA-Z_][a-zA-Z0-9_]*)/g, '&amp;<span class="reference">$1</span>')
              .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
            
            processed = processed.replace(/__STRING_(\d+)__/g, (_, idx) => {
              return `<span class="string">${stringPlaceholders[parseInt(idx)]}</span>`;
            });
            
            return processed;
          }
        }).join('');
      }

      return (
        <div key={index} className="code-line">
          <span className="line-number">{lineNumber}</span>
          <span className="line-content" dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        </div>
      );
    });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentCode());
      showToast('Code copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy code:', err);
      showToast('Failed to copy code', 'error');
    }
  };

  return (
    <div className="code-panel">
      <div className="code-header">
        <h3 className="code-title">Code Preview</h3>
        <div className="code-header-controls">
          <button 
            className="info-button"
            onClick={onOpenApiInfo}
          >
            ℹ️ Info
          </button>
          <button 
            className="copy-button"
            onClick={handleCopyCode}
          >
            📋 Copy
          </button>
        </div>
      </div>

      {/* Language Tabs */}
      <div className="language-tabs">
        <button 
          className={`language-tab ${selectedLanguage === 'python' ? 'active' : ''}`}
          onClick={() => setSelectedLanguage('python')}
        >
          Python
        </button>
        <button 
          className={`language-tab ${selectedLanguage === 'javascript' ? 'active' : ''}`}
          onClick={() => setSelectedLanguage('javascript')}
        >
          JavaScript
        </button>
        <button 
          className={`language-tab ${selectedLanguage === 'curl' ? 'active' : ''}`}
          onClick={() => setSelectedLanguage('curl')}
        >
          cURL
        </button>
        <button 
          className={`language-tab ${selectedLanguage === 'rust' ? 'active' : ''}`}
          onClick={() => setSelectedLanguage('rust')}
        >
          Rust
        </button>
      </div>

      <div className="code-preview">
        <div className="code-content-highlighted">
          {highlightCode(getCurrentCode(), getLanguageName())}
        </div>
      </div>
    </div>
  );
};

