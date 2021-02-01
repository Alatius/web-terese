import React, { useState, useRef }  from 'react';
import './App.css';
import { Editor, EditorState, RichUtils } from 'draft-js';
import 'draft-js/dist/Draft.css';

const styleMap = {
  'SPACED': {
    color: 'red',
  },
  'FRAKTUR': {
    color: 'blue',
  },
};

const styleButtons = [
  {label: 'Bold', style: 'BOLD'},
  {label: 'Italic', style: 'ITALIC'},
  {label: 'Spaced', style: 'SPACED'},
  {label: 'Fraktur', style: 'FRAKTUR'},
];

function StyleButton({ label, style, onToggle }) {
  return (
    <button
      onMouseDown={event => event.preventDefault()}
      onClick={() => onToggle(style)}
    >
      {label}
    </button>    
  );
}

function MyEditor() {
  const editorRef = useRef();
  const [editorState, setEditorState] = useState(
    () => EditorState.createEmpty(),
  );

  const handleStyleToggle = (style) => {
    setEditorState(state => RichUtils.toggleInlineStyle(state, style));
  };

  return (
    <div>
      {
        styleButtons.map(type => (
          <StyleButton
            key={type.label}
            label={type.label}
            style={type.style}
            onToggle={handleStyleToggle}
          />
        ))
      }
      <Editor
        ref={editorRef}
        editorState={editorState}
        onChange={setEditorState}
        customStyleMap={styleMap}
      />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <MyEditor />
    </div>
  );
}

export default App;
