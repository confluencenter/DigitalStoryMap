/**
 * main.js - Application entry point
 * ES modules - no build step
 */

import { App } from './components/App.js';
import { GlobeContainer } from './components/GlobeContainer.js';

// Register components in window.MapApp namespace
window.MapApp = window.MapApp || {};
window.MapApp.App = App;
window.MapApp.GlobeContainer = GlobeContainer;

// Render app
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(App)
);
