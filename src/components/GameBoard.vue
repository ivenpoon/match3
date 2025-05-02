<template>
  <div class="game">
    <header class="game__header">
      <div class="game__controls">
        <button @click="handleDelayedRestart" class="button">New Game</button>
        <div class="game__stats">
          Cards remaining: {{ remainingCards }}
        </div>
      </div>
      <button @click="shuffleAvailableCards" class="button button--secondary">
        🔄 Shuffle
      </button>
    </header>
    
    <main class="game__main">
      <div class="board">
        <TransitionGroup name="card" tag="div" class="board__grid">
          <Card
            v-for="card in cards"
            :key="card.id"
            :style="{
              position: 'absolute',
              left: `${card.x}px`,
              top: `${card.y}px`,
              zIndex: card.layer,
              opacity: isLoading ? 0 : 1
            }"
            :emoji="card.emoji"
            :is-free="isCardFree(card)"
            :selected="false"
            @select="selectCard(card)"
            v-show="!isRemoved(card)"
          />
        </TransitionGroup>
      </div>

      <div class="rack">
        <div class="rack__slots">
          <div 
            v-for="index in MAX_RACK_CARDS" 
            :key="index"
            class="rack__slot-wrapper"
          >
            <div 
              v-if="!rackCards[index - 1]"
              class="rack__slot"
            />
            <Card
              v-else
              :emoji="rackCards[index - 1].emoji"
              :is-free="true"
              :selected="false"
              @select="selectCard(rackCards[index - 1])"
            />
          </div>
        </div>
      </div>
    </main>

    <Transition name="fade">
      <div v-if="isGameWon || (isGameOver && !isGameWon)" class="overlay">
        <div class="overlay__content" :class="{ 'overlay__content--win': isGameWon }">
          <div class="overlay__message">
            {{ isGameWon ? 'Congratulations! You\'ve won! 🎉' : 'Game Over! Rack is full! 😢' }}
          </div>
          <button @click="handleDelayedRestart" class="button">
            🔄 {{ isGameWon ? 'Play Again' : 'Try Again' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * GameBoard Component
 * Main game interface that manages the game board, card rack, and game controls
 * 
 * Features:
 * - Displays and manages the pyramid of cards
 * - Handles card selection and matching
 * - Shows game status (remaining cards, win/lose states)
 * - Provides game control buttons (New Game, Restart)
 * - Includes debug functionality for testing
 */

import { computed, onMounted, ref, nextTick } from 'vue'
import Card from './Card.vue'
import { useGameState } from '../composables/useGameState'

const MAX_RACK_CARDS = 7
const isLoading = ref(false)

// Initialize game state management
const {
  cards,
  rackCards,
  leftDeck,
  rightDeck,
  initializeGame,
  isCardFree,
  selectCard,
  isGameOver,
  isGameWon,
  removedCards,
  shuffleAvailableCards
} = useGameState()

// Initialize the game when component is mounted
onMounted(() => {
  initializeGame()
})

/**
 * Handles game restart with a delay to ensure proper card positioning
 * 1. Sets loading state to hide cards
 * 2. Waits for next render cycle
 * 3. Initializes new game after delay
 * 4. Reveals cards in their new positions
 */
const handleDelayedRestart = async () => {
  isLoading.value = true
  await nextTick()
  setTimeout(() => {
    initializeGame()
    isLoading.value = false
  }, 1000) // 1 second delay
}

// Computed properties
const remainingCards = computed(() => cards.value.length - removedCards.value.size)
const isRemoved = (card) => removedCards.value.has(card.id)
</script>

<style scoped>
/* Main layout */
.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Header section with controls */
.game__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.game__controls {
  display: flex;
  gap: 20px;
  align-items: center;
}

.game__stats {
  font-size: 1.2rem;
  color: #333;
  min-width: 200px; /* Prevent layout shift */
}

/* Main game area */
.game__main {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* Game board */
.board {
  position: relative;
  width: 1000px;
  height: 600px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--border-radius);
  overflow: visible; /* Allow cards to overflow for hover effects */
}

.board__grid {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Card rack styling */
.rack {
  width: 1000px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--border-radius);
  margin-top: 20px;
  padding: 10px;
}

.rack__slots {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 10px 0;
}

.rack__slot-wrapper {
  width: var(--card-width);
  height: var(--card-height);
  position: relative;
}

.rack__slot {
  width: 100%;
  height: 100%;
  border: 2px dashed #ccc;
  border-radius: var(--border-radius);
  background: rgba(255, 255, 255, 0.3);
}

/* Card transitions */
/* .card-enter-active {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
}

.card-leave-active {
  position: absolute;
}

.card-enter-from,
.card-leave-to {
  transform: translateY(-8px);
} */

/* Game over overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.overlay__content {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius);
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(0);
  transition: transform 0.3s ease;
}

.overlay__content--win {
  background: #f8f9fa;
  border: 2px solid var(--primary-color);
}

.overlay__message {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
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