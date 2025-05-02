/**
 * Card Component
 * Represents a single card in the game with an emoji and interactive states
 * 
 * Performance Optimizations:
 * 1. Uses CSS transforms for animations (GPU accelerated)
 * 2. Uses will-change: transform to optimize rendering
 * 3. Minimizes reactive props to essential data only
 * 4. Uses scoped styles to prevent CSS pollution
 * 5. Implements efficient conditional rendering
 */

<template>
  <div 
    class="card" 
    :class="{ 
      'card--selected': selected,
      'card--free': isFree,
      'card--flowing': isFlowing
    }"
    @click="handleClick"
  >
    <div class="card__emoji">{{ emoji }}</div>
    <div v-if="!isFree" class="card__shade"></div>
  </div>
</template>

<script setup>
/**
 * Card Component
 * Represents a single card in the game with an emoji and interactive states
 * 
 * Props:
 * @prop {string} emoji - The emoji character to display on the card
 * @prop {boolean} selected - Whether the card is currently selected
 * @prop {boolean} isFree - Whether the card can be interacted with
 * @prop {boolean} isFlowing - Whether the card is flowing to the rack
 * 
 * Events:
 * @emits {select} - Emitted when a free card is clicked
 */

const props = defineProps({
  emoji: {
    type: String,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  isFree: {
    type: Boolean,
    default: true
  },
  isFlowing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

/**
 * Handles card click events
 * Performance note: Uses early return pattern to avoid unnecessary event handling
 */
const handleClick = () => {
  if (props.isFree) {
    emit('select')
  }
}
</script>

<style scoped>
/* Base card styling with performance optimizations */
.card {
  width: var(--card-width);
  height: var(--card-height);
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  /* Optimize transitions for GPU acceleration */
  /* transform: translateY(0);
  transition: transform 0.2s ease, box-shadow 0.2s ease; */
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  /* Hint to browser about upcoming transforms */
  /* will-change: transform, box-shadow; */
}

/* Optimized emoji container */
.card__emoji {
  font-size: 2rem;
  position: relative;
  /* Use z-index sparingly and only when needed */
  z-index: 1;
}

/* Efficient shade overlay using pseudo-element */
.card__shade {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--border-radius);
  z-index: 2;
}

/* GPU-accelerated transform for selected state */
/* .card--selected {
  transform: translateY(-8px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
} */

/* Flowing animation to rack */
.card--flowing {
  animation: flowToRack 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  z-index: 100;
}

@keyframes flowToRack {
  0% {
    transform: translateY(-8px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
  100% {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

/* Optimized hover effect */
/* .card--free:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
} */

/* Efficient disabled state */
.card:not(.card--free) {
  cursor: not-allowed;
  opacity: 0.9;
}
</style> 