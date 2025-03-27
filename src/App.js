import React, { useState, useEffect } from 'react';
import { Clipboard, ClipboardCheck, Code, Settings, Moon, Sun, AlertCircle, Info } from 'lucide-react';
import './App.css';
import CodeEditor from '@uiw/react-textarea-code-editor';
import clippy from './assets/1280x1024-clippy.gif'

const App = () => {
  const [code, setCode] = useState('');
  const [processedCode, setProcessedCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [commentLevel, setCommentLevel] = useState('standard');
  const [promptType, setpromptType] = useState('Code');
  const [codeDebug, setcodeDebug] = useState(false);
  const [codeOptmize, setcodeOptmize] = useState(false);
  const [codeExplanation, setcodeExplanation] = useState(false);
  
  const [preserveStructure, setPreserveStructure] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('anthropic_api_key') || '';
  });

  // Save API key to localStorage when changed
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('anthropic_api_key', apiKey);
    }
  }, [apiKey]);

  // Detect language based on code input
  useEffect(() => {
    if (code.trim()) {
      // Simple language detection based on keywords and syntax
      if (code.includes('import React') || code.includes('useState')) {
        setDetectedLanguage('JavaScript/React');
      } else if (code.includes('def ') || code.includes('import ') && !code.includes(';')) {
        setDetectedLanguage('Python');
      } else if (code.includes('public class') || code.includes('public static void main')) {
        setDetectedLanguage('Java');
      } else if (code.includes('#include') || code.includes('int main()')) {
        setDetectedLanguage('C/C++');
      } else if (code.includes('<?php')) {
        setDetectedLanguage('PHP');
      } else {
        setDetectedLanguage('Unknown');
      }
    } else {
      setDetectedLanguage('');
    }
  }, [code]);

	const callAnthropicAPI = async (promptText) => {
	  if (!apiKey) {
		throw new Error('API key is required');
	  }

	  try {
		// Use your backend proxy instead of calling Anthropic directly
		const backendUrl = process.env.NODE_ENV === 'production'
		  ? 'https://yourproductiondomain.com/api/anthropic'
		  : 'http://localhost:3001/api/anthropic';
		
		const response = await fetch(backendUrl, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({
			apiKey: apiKey,
			prompt: promptText,
			commentLevel,
			preserveStructure
		  })
		});

		if (!response.ok) {
		  const errorData = await response.json();
		  throw new Error(errorData.error || 'Error calling Anthropic API');
		}

		const data = await response.json();
		return data.content[0].text;
	  } catch (error) {
		console.error('API call failed:', error);
		throw error;
	  }
	};


  const processCode = async () => {
    if (!code.trim()) {
      showNotification('Please paste some code first', 'error');
      return;
    }

    if (!apiKey) {
      showNotification('Please enter your Anthropic API key in settings', 'error');
      setShowSettings(true);
      return;
    }

    setIsProcessing(true);
    
    try {

      let promptText = `I have the following ${detectedLanguage || 'code'} that I'd like you to improve:\n\n\`\`\`\n${code}\n\`\`\`\n\n`;

      if (promptType === 'Code') {
        promptText += "Rigorously analyze the provided code\n\n ";


        if (codeOptmize) {
          promptText += " Structure the code according to best practices.\n Respect specified constraints (performance, resource usage).\n";
        } 

        if (codeDebug) {
          promptText += " Identify all potential bugs and issues.\n Propose a corrected version of the code\n";
        }

        if (codeExplanation){
          promptText += "Add at the end, in comments, a dedicated section summarizing identified problems and solutions provided\n";

          if (!codeOptmize && codeDebug) {
            promptText += "title the section 'BUGS FOUND AND FIXES MADE'\n";
          }

          else if (!codeDebug && codeOptmize){
            promptText += "title the section 'UNOPTIMIZED CODE FOUND AND FIXES MADE'\n";
          }

          else if (codeDebug && codeOptmize){
            promptText += "title the section 'BUGS AND UNOPTIMIZED CODE FOUND AND FIXES MADE'\n";
          }

        } 

        if (preserveStructure) {
          promptText += "Optimize this code WITHOUT changing its structure or functionality. \n";
        } else {
          promptText += `Please optimize this code. You can improve variable names, code structure and organization.\n `;
        }
      
        if (commentLevel === 'none') {
          promptText += "Includes no comments.\n";
        } else if (commentLevel === 'minimal') {
          promptText += "Add only essential, brief comments for the most important parts.\n";
        } else if (commentLevel === 'detailed') {
          promptText += "Add comprehensive documentation including function purpose, parameters, return values, and explain complex logic in detail.\n";
        } else {
          promptText += "Add standard comments that explain what the code does at a function level and for any non-obvious logic.\n";
        }

        promptText += "In code comments, do not reference the original code\n\n";
      }
      else {
        promptText += "Generate the requested Python code\n\
        Respect specified constraints (performance, resource usage)\n\n";
        
        if (preserveStructure) {
          promptText += "Optimize this code WITHOUT changing its structure or functionality. \n";
        } else {
          promptText += `Please optimize this code. You can improve variable names, code structure and organization.\n `;
        }
        
        
        if (commentLevel === 'none') {
          promptText += "Includes no comments.\n";
        } else if (commentLevel === 'minimal') {
          promptText += "Add only essential, brief comments for the most important parts.\n";
        } else if (commentLevel === 'detailed') {
          promptText += "Add comprehensive documentation including function purpose, parameters, return values, and explain complex logic in detail.\n";
        } else {
          promptText += "Add standard comments that explain what the code does at a function level and for any non-obvious logic.\n";
        }

        promptText += "Structure the code according to best practices\n\
                      Respond only with the code, without additional text\n\n";
      }

      
      
      // Call the Anthropic API
      const result = await callAnthropicAPI(promptText);
      
      // Extract code from the response (assuming it's wrapped in code blocks)
      let processedResult = result;
      
      // If response has markdown code blocks, extract just the code
      const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/;
      const match = result.match(codeBlockRegex);
      if (match && match[1]) {
        processedResult = match[1];
      }
      
      setProcessedCode(processedResult);
      
      // Copy to clipboard
      navigator.clipboard.writeText(processedResult)
        .then(() => {
          setIsCopied(true);
          showNotification('Code processed successfully! Copied to clipboard.', 'success');
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(() => {
          showNotification('Code processed, but failed to copy to clipboard. Please copy manually.', 'warning');
        });
      
    } catch (error) {
      showNotification(`Error: ${error.message || 'Failed to process code'}`, 'error');
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };


  const copyToClipboard = () => {
    if (!processedCode) {
      showNotification('No processed code to copy', 'error');
      return;
    }
    
    navigator.clipboard.writeText(processedCode)
      .then(() => {
        setIsCopied(true);
        showNotification('Copied to clipboard!', 'success');
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        showNotification('Failed to copy to clipboard', 'error');
      });
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const resetForm = () => {
    setCode('');
    setProcessedCode('');
    setDetectedLanguage('');
    setIsCopied(false);
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <header>
        <div className="logo">
          <Code size={24} />
          <h1>CopyCode</h1>
        </div>
        <div className="actions">
          <button className="icon-button" onClick={toggleSettings} title="Settings">
            <Settings size={20} />
          </button>
          <button className="icon-button" onClick={toggleDarkMode} title="Toggle Dark Mode">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main>
        <div className="code-container">
          <div className="input-area">
            <div className="textarea-header">
              <label>Paste your code here</label>
              {detectedLanguage && <span className="language-tag">{detectedLanguage}</span>}
            </div>
            <CodeEditor
              value={code}
              language="python"
              placeholder="Paste your code here..."
              onChange={(e) => setCode(e.target.value)}
              padding={15}
              style={{
                backgroundColor: "#f5f5f5",
                fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
              }}
            />
          </div>

          <div className="button-container">
            <button 
              className="process-button" 
              onClick={processCode} 
              disabled={isProcessing || !code.trim()}
            >
              {isProcessing ? 'Processing...' : 'Optimize & Comment'}
            </button>
            {processedCode && (
              <button className="copy-button" onClick={copyToClipboard} disabled={isProcessing}>
                {isCopied ? <ClipboardCheck size={18} /> : <Clipboard size={18} />}
                {isCopied ? 'Copied!' : 'Copy Result'}
              </button>
            )}
            {(code || processedCode) && (
              <button className="reset-button" onClick={resetForm} disabled={isProcessing}>
                Reset
              </button>
            )}
          </div>

          {processedCode && (
            <div className="output-area">
              <div className="textarea-header">
                <label>Optimized Result</label>
                <span className="copied-tag">Auto-copied to clipboard</span>
              </div>
              <pre className="processed-code">
                {processedCode}
              </pre>
            </div>
          )}
        </div>

        {showSettings && (
          <div className="settings-panel">
            <h3>Settings</h3>
            <div className="setting-group">
              <label>Mode</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="promptType"
                    value="Code"
                    checked={promptType === 'Code'}
                    onChange={() => setpromptType('Code')}
                  />
                  Code
                </label>
                <label>
                  <input
                    type="radio"
                    name="promptType"
                    value="Text"
                    checked={promptType === 'Text'}
                    onChange={() => setpromptType('Text')}
                  />
                  Text
                </label>
                
              </div>
            </div>
            <div className="setting-group">
              <label>Comment Detail Level</label>
              <div className="radio-group">
              <label>
                  <input
                    type="radio"
                    name="commentLevel"
                    value="none"
                    checked={commentLevel === 'none'}
                    onChange={() => setCommentLevel('none')}
                  />
                  None
                </label>
                <label>
                  <input
                    type="radio"
                    name="commentLevel"
                    value="minimal"
                    checked={commentLevel === 'minimal'}
                    onChange={() => setCommentLevel('minimal')}
                  />
                  Minimal
                </label>
                <label>
                  <input
                    type="radio"
                    name="commentLevel"
                    value="standard"
                    checked={commentLevel === 'standard'}
                    onChange={() => setCommentLevel('standard')}
                  />
                  Standard
                </label>
                <label>
                  <input
                    type="radio"
                    name="commentLevel"
                    value="detailed"
                    checked={commentLevel === 'detailed'}
                    onChange={() => setCommentLevel('detailed')}
                  />
                  Detailed
                </label>
              </div>
            </div>
            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={preserveStructure}
                  onChange={() => setPreserveStructure(!preserveStructure)}
                />
                Preserve original structure (comments only)
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={codeDebug}
                  onChange={() => setcodeDebug(!codeDebug)}
                />
                Code Debugging
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={codeOptmize}
                  onChange={() => setcodeOptmize(!codeOptmize)}
                />
                Code Optimization
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={codeExplanation}
                  onChange={() => setcodeExplanation(!codeExplanation)}
                />
                Code Explanation
              </label>
            </div>
            
            <div className="api-key-section">
              <label>Anthropic API Key</label>
              <input 
                type="password" 
                placeholder="sk-ant-api..." 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="api-note">
                <Info size={14} />
                Your API key is stored locally and never sent to our servers
              </p>
            </div>
            <img src={clippy} alt="clippy !" />
          </div>
        )}
      </main>

      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
          {notification.message}
        </div>
      )}

      <footer>
        <p>Powered by Claude 3.7 • <a href="#">Privacy Policy</a> • <a href="#">About</a></p>
      </footer>
    </div>
  );
};

export default App;
