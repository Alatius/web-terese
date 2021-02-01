import React, { useState, useEffect }  from 'react';
import './App.css';
import { Editor, EditorState, RichUtils } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { stateToHTML } from 'draft-js-export-html';

const styleMap = {
  'BOLD': {
    fontWeight: 'bold',
    backgroundColor: 'yellow',
  },
  'ITALIC': {
    fontStyle: 'italic',
    backgroundColor: 'lightgreen',
  },
  'SPACED': {
    color: 'red',
  },
  'FRAKTUR': {
    backgroundColor: 'lightblue',
  },
};

const styleButtons = [
  {label: 'Bold', style: 'BOLD'},
  {label: 'Italic', style: 'ITALIC'},
  {label: 'Spaced', style: 'SPACED'},
  {label: 'Fraktur', style: 'FRAKTUR'},
];

const exportOptions = {
  inlineStyles: {
    BOLD: { element: 'b' },
    SPACED: { element: 'sp' },
    FRAKTUR: { element: 'fr' },
  },
};

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
  const [editorState, setEditorState] = useState(
    () => EditorState.createEmpty(),
  );

  const handleStyleToggle = (style) => {
    setEditorState(state => RichUtils.toggleInlineStyle(state, style));
  };

  useEffect(() => {
    console.log(stateToHTML(editorState.getCurrentContent(), exportOptions));
  }, [editorState]);

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
