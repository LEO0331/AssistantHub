import React, { useState } from "react";
import Field from "./components/field";
import Translate from "./components/translate";
import Languages from "./components/languages";

export default function App() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('es');

  return (
    <div>
      <Field onChange={setText}/>
      <Languages language={language} onLanguageChange={setLanguage}/>
      <hr/>
      <Translate text={text} language={language}/>
    </div>
  );
}
