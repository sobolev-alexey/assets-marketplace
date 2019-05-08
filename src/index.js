import React from 'react';
import ReactDOM from 'react-dom';
import WebFontLoader from 'webfontloader';
import { Provider } from 'react-redux';
import firebase from 'firebase/app';
import 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import './assets/scss/index.scss';
import Router from './Router';
import configureStore from './store/configure';
import config from './config.json';
import * as serviceWorker from './serviceWorker';

WebFontLoader.load({
  google: {
    families: ['Nunito Sans:300,400,600,700', 'Material Icons'],
  },
});

firebase.initializeApp(config);
const store = configureStore();

const renderApp = () => (
  <Provider store={store}>
    <Router />
  </Provider>
);

ReactDOM.render(renderApp(), document.getElementById('root'));

serviceWorker.unregister();
