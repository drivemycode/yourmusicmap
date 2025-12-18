import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {App } from './App.jsx'
import NotFoundPage from "./components/NotFoundPage.jsx";
import About from "./components/About.jsx";
import TopArtists from "./components/TopArtists.jsx";
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  {path: "/", element: <App />},
  {path: "/about", element: <About />},
  {path: "/topartists", element: <TopArtists />},
  {path: "*", element: <NotFoundPage />},
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)

