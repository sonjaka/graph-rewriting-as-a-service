<script setup lang="js">
import { computed, ref } from 'vue'

import { useTicTacToeRules } from '../composables/useRules.ts'

const apiUrl = import.meta.env.VITE_APP_API_URL

const { autoPlayRule, emptyRule, autoPlayRuleBlockUser } = useTicTacToeRules()

// defineProps<{
//   msg: string
// }>()

// const boardModel = [
//   ['', '', ''],
//   ['', '', ''],
//   ['', '', ''],
// ]
const boardModel = ref([
  [
    { key: 'topLeft', mark: '' },
    { key: 'topCenter', mark: '' },
    { key: 'topRight', mark: '' },
  ],
  [
    { key: 'centerLeft', mark: '' },
    { key: 'centerCenter', mark: '' },
    { key: 'centerRight', mark: '' },
  ],
  [
    { key: 'bottomLeft', mark: '' },
    { key: 'bottomCenter', mark: '' },
    { key: 'bottomRight', mark: '' },
  ],
])

const hasGameStarted = ref(false)
const isLoading = ref(false)
const showStartGameErrorMessage = ref(false)
const showAutoPlayerErrorMessage = ref(false)

const handleStart = () => {
  hasGameStarted.value = true
  console.log('Game started:' + hasGameStarted.value)
  showStartGameErrorMessage.value = false
}

const handleClick = async (rowIndex, columnIndex, column) => {
  console.log('click', rowIndex, columnIndex)
  // if (isLoading) {
  //   showAutoPlayerErrorMessage.value = true
  //   return
  // }

  if (column.mark) {
  }

  isLoading.value = true
  const hostgraph = getHostgraphFromBoardModel()

  if (hasGameStarted.value) {
    await calculatePlayerMove(rowIndex, columnIndex)

    await checkGameStatus()

    await calculateComputerMove()
  } else {
    showStartGameErrorMessage.value = true
  }
  showAutoPlayerErrorMessage.value = false
  isLoading.value = false
}

const hostgraph = computed(() => {
  return getHostgraphFromBoardModel()
})

const getHostgraphFromBoardModel = () => {
  const hostgraph = {
    options: {
      type: 'directed',
    },
    nodes: [],
    edges: [],
  }
  for (let i = 0; i < boardModel.value.length; i++) {
    const row = boardModel.value[i]
    let prevColumnKey = ''

    for (let j = 0; j < boardModel.value.length; j++) {
      const column = boardModel.value[i][j]
      const field = {}
      field.key = column.key
      field.attributes = {
        mark: column.mark,
        row: i,
        column: j,
        type: 'field',
      }

      hostgraph.nodes.push(field)

      // Set "right" edges
      if (j > 0) {
        const edge = {}
        const leftField = boardModel.value[i][j - 1]
        edge.source = leftField.key
        edge.target = column.key
        edge.key = `${leftField.key}To${column.key}`
        edge.attributes = {
          type: 'right',
          direction: 'right',
        }

        hostgraph.edges.push(edge)
      }

      // Set "down" edges
      if (i > 0) {
        const upField = boardModel.value[i - 1][j]
        const edge = {}
        edge.source = upField.key
        edge.target = column.key
        edge.key = `${upField.key}To${column.key}`
        edge.attributes = {
          type: 'down',
          direction: 'down',
        }

        hostgraph.edges.push(edge)
      }

      // Set "diagonal" edges top left to bottom right
      if (i > 0 && i == j) {
        const upField = boardModel.value[i - 1][j - 1]
        const edge = {}
        edge.source = upField.key
        edge.target = column.key
        edge.key = `${upField.key}To${column.key}`
        edge.attributes = {
          type: 'diagonalTLtoBR',
          direction: 'diagonalTLtoBR',
        }

        hostgraph.edges.push(edge)
      }

      // Set "diagonal" edges bottom left to top right
      if ((i > 0 && Math.abs(i - j) == 2) || i == j) {
        if (boardModel.value[i - 1] && boardModel.value[i - 1][j + 1]) {
          const upField = boardModel.value[i - 1][j + 1]
          const edge = {}
          edge.source = upField.key
          edge.target = column.key
          edge.key = `${upField.key}To${column.key}`
          edge.attributes = {
            type: 'diagonalBLtoTR',
            direction: 'diagonalBLtoTR',
          }

          hostgraph.edges.push(edge)
        }
      }
    }
  }

  const gameStateNode = compileGameStateNode()
  hostgraph.nodes.push(gameStateNode)

  return hostgraph
}

const updateBoardModelFromJson = (data) => {
  // May contain multiple results
  const result = data[data.length - 1]
  result.nodes.forEach((element) => {
    const attributes = element.attributes
    // Update board data
    if (attributes?.type === 'field') {
      if (attributes?.mark) {
        if (
          boardModel.value[attributes.row] &&
          boardModel.value[attributes.row][attributes.column]
        ) {
          boardModel.value[attributes.row][attributes.column]['mark'] = attributes.mark
        }
      }
    } else if (attributes?.type === 'state') {
    }
  })
}

const calculateComputerMove = async () => {
  // check Blocking moves
  const directions = ['down', 'right', 'diagonalTLtoBR', 'diagonalBLtoTR']
  for (const direction of directions) {
    const checkBlockingMoveRule = structuredClone(autoPlayRuleBlockUser)
    checkBlockingMoveRule.patternGraph.edges[0].attributes.direction = direction
    checkBlockingMoveRule.patternGraph.edges[1].attributes.direction = direction

    const completeRule = {
      hostgraph: getHostgraphFromBoardModel(),
      rules: [checkBlockingMoveRule],
    }

    const response = await fetch(apiUrl + '/find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(completeRule),
    })

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`)
    }

    const json = await response.json()
    const resultData = json.data

    if (resultData.length) {
      const nodes = resultData[0].nodes
      const nodeToMark = Object.values(nodes).find((node) => !node.attributes.mark)

      if (!nodeToMark) continue

      const markSingleNode = createSingleNodeUpdateRule(
        nodeToMark.attributes.row,
        nodeToMark.attributes.column,
        'O',
      )

      const grsRule = {
        hostgraph: getHostgraphFromBoardModel(),
        rules: [markSingleNode],
      }

      const response = await fetch(apiUrl + '/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(grsRule),
      })

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
      }

      const json = await response.json()
      const boardData = json.data
      updateBoardModelFromJson(boardData)

      // Break loop and return from function as rewriting is already done
      return
    }
  }

  try {
    const grsRule = {
      hostgraph: getHostgraphFromBoardModel(),
      rules: [autoPlayRule],
    }

    const response = await fetch(apiUrl + '/transform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(grsRule),
    })

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`)
    }

    const json = await response.json()
    const data = json.data
    updateBoardModelFromJson(data)
  } catch (error) {
    console.error(error.message)
  }
}

const calculatePlayerMove = async (row, column) => {
  try {
    const playerMoveRule = createSingleNodeUpdateRule(row, column, 'X')

    const grsRule = {
      hostgraph: getHostgraphFromBoardModel(),
      rules: [playerMoveRule],
    }

    const response = await fetch(apiUrl + '/transform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(grsRule),
    })

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`)
    }

    const json = await response.json()
    const data = json.data
    updateBoardModelFromJson(data)
  } catch (error) {
    console.error(error.message)
  }
}

const createSingleNodeUpdateRule = (row, column, mark) => {
  const markSingleNodeRule = structuredClone(emptyRule)

  markSingleNodeRule.patternGraph.nodes.push({
    key: 'node1',
    attributes: {
      row,
      column,
      type: 'field',
    },
  })

  markSingleNodeRule.replacementGraph.nodes.push({
    key: 'node1',
    attributes: {
      mark,
    },
  })

  return markSingleNodeRule
}

const checkGameStatus = async () => {}

const compileGameStateNode = () => {
  const gameState = {
    key: 'state',
    attributes: {
      type: 'state',
      currentSymbol: 'X',
      status: 'ongoing',
    },
  }

  return gameState
}
</script>

<template>
  <div class="game-wrapper">
    <div v-if="showStartGameErrorMessage">You need to start the game first!</div>
    <div v-if="showAutoPlayerErrorMessage">
      It's the computer players turn. Please wait until loading has finished!
    </div>

    <div class="grid">
      <div v-for="(row, rowIndex) in boardModel">
        <div
          v-for="(column, columnIndex) in row"
          class="grid__item"
          @click="handleClick(rowIndex, columnIndex, column)"
        >
          {{ column.mark }}
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading">loading...</div>

    <div class="controls">
      <button v-if="!hasGameStarted" @click="handleStart">Start Game</button>
    </div>
  </div>
</template>

<style scoped>
.game-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.grid {
  display: grid;
  width: 300px;
  grid-template-columns: repeat(3, 1fr);
  /* grid-template-rows: repeat(3, 1fr); */
  overflow: hidden;
  max-height: auto;
}

.grid__item {
  position: relative;
  width: 100px;
  height: 100px;

  border: 1px solid;
}

/* .grid__item::before,
.grid__item::after {
  content: '';
  position: absolute;
  background-color: var(--line-color);
  z-index: 1;
}

.grid__item::after {
  inline-size: 100vw;
  block-size: var(--line-thickness);
  inset-inline-start: 0;
  inset-block-start: calc(var(--line-offset) * -1);
}

.grid__item::before {
  inline-size: var(--line-thickness);
  block-size: 100vh;
  inset-block-start: 0;
  inset-inline-start: calc(var(--line-offset) * -1);
} */
</style>
