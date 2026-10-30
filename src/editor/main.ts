import { mount } from 'svelte'
import Editor from './Editor.svelte'
import '../styles/tokens.css'
import '../app.css'
import './editor.css'

mount(Editor, { target: document.getElementById('editor')! })
