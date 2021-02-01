import React  from 'react';
import './App.css';
import ImageEditor from './ImageEditor.jsx';
import MarkupEditor from './MarkupEditor.jsx';

function App() {

  return (
    <div className="App">
      <ImageEditor url={'cavlat-1-0184.png'}/>      
      <MarkupEditor />
    </div>
  );
}

export default App;
