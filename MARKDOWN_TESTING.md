# Testing Markdown Rendering in Multiverse

## What is Markdown?

Markdown is a simple way to format text. When you type markdown in your messages, it will be automatically rendered with formatting (bold, code blocks, links, etc.).

## How to Test

1. **Start the app**: Run `npm run dev` and open http://localhost:5173
2. **Send a message** with markdown formatting
3. **See the formatted result** in the chat

## Examples to Try

### 1. **Bold Text**
Type this in a message:
```
This is **bold text** and this is also __bold text__
```

**Result**: The word "bold text" will appear in **bold**

---

### 2. **Italic Text**
Type this in a message:
```
This is *italic text* and this is also _italic text_
```

**Result**: The word "italic text" will appear in *italic*

---

### 3. **Inline Code**
Type this in a message:
```
Use the `console.log()` function to print output
```

**Result**: `console.log()` will appear in a code-style box

---

### 4. **Code Blocks**
Type this in a message:
```
Here's a Python example:
```python
def hello_world():
    print("Hello, World!")
```
```

**Result**: The code will appear in a formatted code block

---

### 5. **Links**
Type this in a message:
```
Check out [Multiverse on GitHub](https://github.com/yourusername/Multiverse)
```

**Result**: The text "Multiverse on GitHub" will be a clickable link

---

### 6. **Combined Example**
Try sending this complete example:
```
Here's a **complete example** with *multiple* formatting:

1. **Bold text** for emphasis
2. `inline code` for functions
3. Code block:
```python
def greet(name):
    return f"Hello, {name}!"
```
4. Link to [documentation](https://example.com)
```

---

## Testing Steps

1. **Open the chat** in Multiverse
2. **Type or paste** one of the examples above
3. **Send the message** (click send button or press Ctrl+Enter)
4. **Look at the result** - you should see:
   - Bold text appears **bold**
   - Italic text appears *italic*
   - Code appears in a monospace font with background
   - Links appear in blue and are clickable

## What Gets Rendered

The markdown renderer supports:
- ✅ **Bold**: `**text**` or `__text__`
- ✅ *Italic*: `*text*` or `_text_`
- ✅ `Inline code`: `` `code` ``
- ✅ Code blocks: ` ```code``` `
- ✅ Links: `[text](url)`
- ✅ Line breaks: Automatic line breaks

## Troubleshooting

**If markdown doesn't render:**
1. Make sure you're using the correct syntax (see examples above)
2. Check that the message was sent successfully
3. Refresh the page and try again
4. Check the browser console for errors

**Common mistakes:**
- Using single asterisks for bold (should be `**text**`)
- Forgetting closing backticks for code blocks
- Missing brackets or parentheses in links

## Visual Example

**What you type:**
```
Here's some **bold** and *italic* text with `code` and a [link](https://example.com)
```

**What you see:**
Here's some **bold** and *italic* text with `code` and a [link](https://example.com)

---

## Quick Test Message

Copy and paste this into the chat to test all features at once:

```
**Markdown Test**

This message tests:
- **Bold text**
- *Italic text*
- `Inline code`
- Code block:
```python
print("Hello, World!")
```
- [Clickable link](https://example.com)
```

Send this message and you should see all the formatting applied!

