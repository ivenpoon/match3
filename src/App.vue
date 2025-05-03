<script setup>
import GameBoard from './components/GameBoard.vue'
import './assets/main.css'
</script>

<template>
  <GameBoard />
</template>

<style>
:root {
  /* Base card dimensions - will scale with viewport */
  --card-width: min(8vw, 80px);
  --card-height: min(10vw, 100px);
  --border-radius: 8px;
  --primary-color: #4CAF50;
  --secondary-color: #2196F3;
  
  /* Responsive spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  
  /* Responsive font sizes */
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
  min-height: 100vh;
  padding: 20px;
}

.button {
  padding: 8px 16px;
  font-size: 1rem;
  border: none;
  border-radius: var(--border-radius);
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.button--secondary {
  background: var(--secondary-color);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
