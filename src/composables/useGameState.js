import { ref, computed } from 'vue'

/**
 * Game Configuration Constants
 * These values are defined outside the composable for optimization:
 * - Prevents recalculation on component re-renders
 * - Allows JS engine to optimize memory allocation
 * - Enables better static analysis
 */
const ANIMALS = ['🐱', '🐶', '🐼', '🐸', '🦊', '🐰', '🦉']  // Available emoji sets
const CARDS_PER_SET = 3                         // Number of matching cards needed
const MAX_RACK_CARDS = 7                        // Maximum cards allowed in the rack
const CARD_WIDTH = 80                           // Width of each card in pixels
const CARD_HEIGHT = 100                         // Height of each card in pixels
const CARD_SPACING_X = 85                       // Horizontal spacing between cards
const CARD_SPACING_Y = 105                      // Vertical spacing between cards
const BOARD_WIDTH = 1000                        // Total board width
const BOARD_HEIGHT = 600                        // Total board height
const DECK_SIZE = 12                            // Number of cards per side deck
const DECK_SPACING = 20                         // Vertical spacing between deck cards

/**
 * Layer Configuration
 * Defines the pyramid structure of the game board
 * Each layer represents a level of cards with:
 * - rows: number of rows in this layer
 * - cols: number of columns in this layer
 * - offsetX: horizontal offset from the left edge of the previous layer
 * - offsetY: vertical offset from the top edge of the previous layer
 * 
 * The layers are stacked from bottom to top, with each layer being smaller
 * than the one below it to create a pyramid effect.
 */
const LAYERS = [
  { rows: 4, cols: 7, offsetX: 0, offsetY: 0 },      // Base layer (bottom)
  { rows: 3, cols: 6, offsetX: 42, offsetY: 52 },    // Second layer
  { rows: 2, cols: 5, offsetX: 85, offsetY: 105 },   // Third layer
  { rows: 1, cols: 4, offsetX: 127, offsetY: 157 }   // Top layer
]

/**
 * Pre-calculated Layout Values
 * These calculations are done once at module level for performance:
 * - Avoids recalculating dimensions on each game initialization
 * - Prevents layout thrashing during game resets
 * - Reduces memory allocation during gameplay
 */
const TOTAL_BOARD_CARDS = LAYERS.reduce((sum, layer) => sum + (layer.rows * layer.cols), 0)
const TOTAL_CARDS = TOTAL_BOARD_CARDS + (DECK_SIZE * 2)
const TOTAL_SETS = Math.floor(TOTAL_CARDS / CARDS_PER_SET)

// Board centering calculations (done once)
const BASE_WIDTH = LAYERS[0].cols * CARD_SPACING_X
const BASE_HEIGHT = LAYERS[0].rows * CARD_SPACING_Y
const BASE_X_OFFSET = (BOARD_WIDTH - BASE_WIDTH) / 2
const BASE_Y_OFFSET = (BOARD_HEIGHT - BASE_HEIGHT) / 2

// Deck positioning calculations (done once)
const DECK_HEIGHT = DECK_SIZE * DECK_SPACING + CARD_HEIGHT
const DECK_START_Y = (BOARD_HEIGHT - DECK_HEIGHT) / 2

/**
 * Main game state composable
 * 
 * Performance Optimizations:
 * 1. Uses Vue's ref() for primitive values and small arrays
 * 2. Uses computed properties for derived state to prevent unnecessary recalculations
 * 3. Uses Set for removedCards for O(1) lookup performance
 * 4. Batches card position updates to minimize DOM reflows
 * 5. Uses object spread for card updates to maintain Vue reactivity
 */
export function useGameState() {
  // Core reactive state using ref() for better performance with primitive values
  const cards = ref([])              
  const rackCards = ref([])          
  const removedCards = ref(new Set()) // Using Set for O(1) lookup performance
  const leftDeck = ref([])           
  const rightDeck = ref([])          
  const isGameOver = ref(false)      
  const isGameWon = ref(false)       

  /**
   * Computed property for efficient card lookup by location
   * Performance benefits:
   * - Caches results until dependencies change
   * - Prevents array filtering on every render
   * - Maintains reference equality when data hasn't changed
   */
  const cardsByLocation = computed(() => {
    const locations = {
      board: [],
      leftDeck: [],
      rightDeck: []
    }
    cards.value.forEach(card => {
      if (!removedCards.value.has(card.id)) {
        locations[card.location].push(card)
      }
    })
    return locations
  })

  /**
   * Computed set of free card IDs
   * Performance benefits:
   * - Uses Set for O(1) lookup performance
   * - Only recalculates when cards or decks change
   * - Prevents expensive overlap calculations on every render
   */
  const freeCards = computed(() => {
    const result = new Set()
    
    // O(1) lookup for top deck cards
    if (leftDeck.value.length > 0) {
      result.add(leftDeck.value[leftDeck.value.length - 1].id)
    }
    if (rightDeck.value.length > 0) {
      result.add(rightDeck.value[rightDeck.value.length - 1].id)
    }

    // Batch board card calculations
    const boardCards = cardsByLocation.value.board
    boardCards.forEach(card => {
      if (!hasPhysicalOverlap(card, boardCards)) {
        result.add(card.id)
      }
    })

    return result
  })

  /**
   * Creates a new card object
   * Performance note: Uses object literal for consistent property shape,
   * helping JS engine optimize object creation and property access
   */
  const createCard = (id, emoji, location = 'board') => ({
    id,
    emoji,
    location,
    x: 0,
    y: 0,
    layer: 0
  })

  /**
   * Checks if two cards physically overlap on the board
   * Used to determine if a card is blocked by others above it
   * 
   * @param {Object} card - The card to check
   * @param {Object} other - Another card to check against
   * @returns {boolean} True if the cards overlap and other is above card
   */
  const hasPhysicalOverlap = (card, other) => {
    return other.layer > card.layer && 
           other.x < card.x + CARD_WIDTH &&
           other.x + CARD_WIDTH > card.x &&
           other.y < card.y + CARD_HEIGHT &&
           other.y + CARD_HEIGHT > card.y
  }

  /**
   * Checks if a card is free to be selected
   * A card is free if it's:
   * 1. Not already removed
   * 2. The top card of its deck (if in a deck)
   * 3. Not overlapped by other cards (if on board)
   * 
   * @param {Object} card - The card to check
   * @returns {boolean} True if the card can be selected
   */
  const isCardFree = (card) => {
    if (removedCards.value.has(card.id)) return false

    // Handle deck cards
    if (card.location === 'leftDeck') {
      return leftDeck.value[leftDeck.value.length - 1]?.id === card.id
    }
    if (card.location === 'rightDeck') {
      return rightDeck.value[rightDeck.value.length - 1]?.id === card.id
    }

    // Handle board cards
    return !cards.value.some(other => 
      other.id !== card.id && 
      !removedCards.value.has(other.id) && 
      hasPhysicalOverlap(card, other)
    )
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm
   * Used to randomize card positions during game initialization
   * 
   * @param {Array} array - Array to shuffle
   * @returns {Array} The shuffled array (same reference)
   */
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  /**
   * Initializes or resets the game state
   * Performance optimizations:
   * 1. Batches array operations to minimize reactive updates
   * 2. Creates all cards before assigning positions
   * 3. Uses map operations instead of loops where beneficial
   * 4. Minimizes object creation and property access
   */
  const initializeGame = () => {
    // Reset game state
    cards.value = []
    rackCards.value = []
    removedCards.value = new Set()
    leftDeck.value = []
    rightDeck.value = []
    isGameOver.value = false
    isGameWon.value = false

    // Create all cards
    const allCards = []
    for (let i = 0; i < TOTAL_SETS; i++) {
      const animal = ANIMALS[i % ANIMALS.length]
      for (let j = 0; j < CARDS_PER_SET; j++) {
        allCards.push(createCard(`set-${i}-${j}`, animal))
      }
    }
    shuffleArray(allCards)

    // Initialize left deck with proper positioning
    const leftDeckCards = allCards.slice(0, DECK_SIZE)
    leftDeck.value = leftDeckCards.map((card, i) => {
      return {
        ...card,
        location: 'leftDeck',
        x: 20,
        y: DECK_START_Y + (i * DECK_SPACING),
        layer: i + 1
      }
    })

    // Initialize right deck with proper positioning
    const rightDeckCards = allCards.slice(DECK_SIZE, DECK_SIZE * 2)
    rightDeck.value = rightDeckCards.map((card, i) => {
      return {
        ...card,
        location: 'rightDeck',
        x: BOARD_WIDTH - CARD_WIDTH - 20,
        y: DECK_START_Y + (i * DECK_SPACING),
        layer: i + 1
      }
    })

    // Position remaining cards on board in pyramid layout
    const boardCards = []
    let cardIndex = 0
    const remainingCards = allCards.slice(DECK_SIZE * 2)

    LAYERS.forEach((layer, layerNum) => {
      for (let row = 0; row < layer.rows; row++) {
        for (let col = 0; col < layer.cols; col++) {
          if (cardIndex < remainingCards.length) {
            const card = remainingCards[cardIndex]
            boardCards.push({
              ...card,
              location: 'board',
              x: col * CARD_SPACING_X + BASE_X_OFFSET + layer.offsetX,
              y: row * CARD_SPACING_Y + BASE_Y_OFFSET + layer.offsetY,
              layer: layerNum + 1
            })
            cardIndex++
          }
        }
      }
    })

    // Update cards array with all positioned cards
    cards.value = [...boardCards, ...leftDeck.value, ...rightDeck.value]
  }

  /**
   * Handles card selection
   * Performance optimizations:
   * 1. Early returns for invalid states
   * 2. Uses Set for removed cards lookup
   * 3. Batches state updates
   * 4. Delays match checking to next tick
   */
  const selectCard = (card) => {
    if (isGameOver.value || isGameWon.value) return
    if (!isCardFree(card)) return

    if (!rackCards.value.some(c => c.id === card.id)) {
      // Handle deck cards
      if (card.location === 'leftDeck' || card.location === 'rightDeck') {
        const deck = card.location === 'leftDeck' ? leftDeck : rightDeck
        if (deck.value[deck.value.length - 1]?.id === card.id) {
          // Set flowing state
          card.isFlowing = true
          // Wait for animation to complete before adding to rack
          setTimeout(() => {
            rackCards.value.push({ ...card })
            deck.value.pop()
            removedCards.value.add(card.id)
            setTimeout(checkRackMatches, 300)
          }, 500) // Match animation duration
        }
        return
      }

      // Handle board cards
      // Set flowing state
      card.isFlowing = true
      // Wait for animation to complete before adding to rack
      setTimeout(() => {
        rackCards.value.push(card)
        removedCards.value.add(card.id)
        setTimeout(checkRackMatches, 300)
      }, 500) // Match animation duration
    }
  }

  /**
   * Checks for matches in the rack
   * Performance optimizations:
   * 1. Uses Map for grouping to avoid array searches
   * 2. Batches array filtering operations
   * 3. Early returns for impossible match cases
   */
  const checkRackMatches = () => {
    // Group cards by emoji
    const groups = new Map()
    rackCards.value.forEach(card => {
      const group = groups.get(card.emoji) || []
      group.push(card)
      groups.set(card.emoji, group)
    })

    // Check for matches (sets of 3)
    let hadMatch = false
    groups.forEach(group => {
      if (group.length >= CARDS_PER_SET) {
        rackCards.value = rackCards.value.filter(card => 
          !group.slice(0, CARDS_PER_SET).some(match => match.id === card.id)
        )
        hadMatch = true
      }
    })

    // Check win/lose conditions
    const allCardsRemoved = cards.value.every(card => removedCards.value.has(card.id))
    const decksEmpty = leftDeck.value.length === 0 && rightDeck.value.length === 0

    if (allCardsRemoved && decksEmpty) {
      isGameWon.value = true
    } else if (rackCards.value.length >= MAX_RACK_CARDS) {
      const possibleMatch = Array.from(groups.values()).some(group => 
        group.length >= CARDS_PER_SET
      )
      if (!possibleMatch) {
        isGameOver.value = true
      }
    }
  }

  /**
   * Shuffles only the available (non-removed) cards while maintaining the same
   * number of cards in each layer and deck. This preserves the game's visual structure
   * while randomizing card positions within each layer/deck.
   * 
   * Performance optimization:
   * - Shuffles cards within their layers instead of redistributing
   * - Avoids unnecessary position recalculations
   * - Maintains visual balance of the game board
   */
  const shuffleAvailableCards = () => {
    // Get available cards grouped by their current location
    const availableByLocation = {
      leftDeck: leftDeck.value.filter(card => !removedCards.value.has(card.id)),
      rightDeck: rightDeck.value.filter(card => !removedCards.value.has(card.id)),
      board: cards.value.filter(card => 
        card.location === 'board' && !removedCards.value.has(card.id)
      )
    }

    // Group board cards by layer
    const boardLayers = []
    for (let layer = 1; layer <= LAYERS.length; layer++) {
      boardLayers[layer - 1] = availableByLocation.board.filter(card => card.layer === layer)
    }

    // Shuffle each group independently
    shuffleArray(availableByLocation.leftDeck)
    shuffleArray(availableByLocation.rightDeck)
    boardLayers.forEach(layer => shuffleArray(layer))

    // Reposition left deck cards (maintaining their count)
    leftDeck.value = availableByLocation.leftDeck.map((card, i) => ({
      ...card,
      location: 'leftDeck',
      x: 20,
      y: DECK_START_Y + (i * DECK_SPACING),
      layer: i + 1
    }))

    // Reposition right deck cards (maintaining their count)
    rightDeck.value = availableByLocation.rightDeck.map((card, i) => ({
      ...card,
      location: 'rightDeck',
      x: BOARD_WIDTH - CARD_WIDTH - 20,
      y: DECK_START_Y + (i * DECK_SPACING),
      layer: i + 1
    }))

    // Reposition board cards within their original layers
    const boardCards = []
    LAYERS.forEach((layerConfig, layerIndex) => {
      const layerCards = boardLayers[layerIndex]
      let cardIndex = 0
      
      for (let row = 0; row < layerConfig.rows; row++) {
        for (let col = 0; col < layerConfig.cols; col++) {
          if (cardIndex < layerCards.length) {
            const card = layerCards[cardIndex]
            boardCards.push({
              ...card,
              location: 'board',
              x: col * CARD_SPACING_X + BASE_X_OFFSET + layerConfig.offsetX,
              y: row * CARD_SPACING_Y + BASE_Y_OFFSET + layerConfig.offsetY,
              layer: layerIndex + 1
            })
            cardIndex++
          }
        }
      }
    })

    // Update cards array with all repositioned cards
    cards.value = [...boardCards, ...leftDeck.value, ...rightDeck.value, ...rackCards.value]
  }

  return {
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
  }
} 