class SimpleNodeOnEdgeEngine {
    constructor(network, nodes, dotNodes, edges, forwTable) {
        this.network = network;
        this.nodes = nodes;
        this.edges = edges;
        this.dotNodes = dotNodes;
        this.forwTable = forwTable;


        this.linksByEdges = {};
        this.edgesMoved = false;
        this.currentTime = 0;
        this.ratio_inc = 1; // in %
        this.time_delay = 10; // in ms

        this.timer = null;
        this.lastTime = 0;
        this.targetInterval = this.time_delay;
    }

    /**
     * Initializes the movement of the nodes on edges.
     */
    initMovement() {
        // Update the position of the dot node before the redraw event
        this.network.on('beforeDrawing', (ctx) => {
            if (this.edgesMoved) {
                this.edgesMoved = false;
                this.dotNodes.forEach((dotNode) => {
                    this.fixDotOnEdge(dotNode);
                });
            }
        });

        this.network.on('dragging', (params) => {
            if (params.edges.length <= 0) {
                return;
            }
            this.edgesMoved = true;
            params.edges.forEach((edgeId) => {
                this.edges.get(edgeId).pointsArr = {};
            });
        });

        this.network.on('click', (properties) => {
            var ids = properties.nodes;
            if (ids.length > 0) {
                console.log("x: " + properties.pointer.canvas.x + " y: " + properties.pointer.canvas.y);
                console.log(this.nodes.get(ids)[0]);
            } else {
                ids = properties.edges;
                if (ids.length > 0) {
                    console.log("x: " + properties.pointer.canvas.x + " y: " + properties.pointer.canvas.y);
                    console.log(this.edges.get(ids)[0]);
                } else {
                    console.log("x: " + properties.pointer.canvas.x + " y: " + properties.pointer.canvas.y);
                }
            }
        });

        this.dotNodes.on('add', (event, properties) => {
            properties.items.forEach((nodeId) => {
                var node = this.dotNodes.get(nodeId);
                this.nodes.add(node);
                console.log(this.nodes);
            });
        });
        
        // Add trace node when updating target
        this.dotNodes.on('remove', (event, properties) => {
            properties.oldData.forEach((node) => {
                this.nodes.remove(node.id);
            });
        });

        this.timer = requestAnimationFrame(this.loop);
    }

    loop = (timestamp) => {
        const elapsed = timestamp - this.lastTime;
        if (elapsed >= this.targetInterval) {
          this.lastTime = timestamp;
          this.moveDot(this.ratio_inc);
        }
        this.timer = requestAnimationFrame(this.loop);
    };

    /**
     * Moves the dot nodes on the edges based on the current ratio.
     * @param {number} current_ratio - The current ratio of the movement.
     */
    moveDot(current_ratio) {
        if (this.dotNodes.length <= 0) {
            return;
        }
        this.dotNodes.forEach((dotNode) => {
            dotNode.ratio += current_ratio;
            if (dotNode.ratio > 100) {
                if (!this.updateDotNode(dotNode, dotNode.target, this.forwTable[dotNode.target][dotNode.source], dotNode.ratio - 100)) {
                    this.dotNodes.remove(dotNode);
                    return;
                }
            }
            this.fixDotOnEdge(dotNode);
        });
        this.network.redraw();
    }

    /**
     * Fixes the position of the dot node on the edge.
     * @param {object} dotNode - The dot node object.
     */
    fixDotOnEdge(dotNode) {
        var edge = this.network.body.edges[dotNode.edge];
        var current_ratio = dotNode.reversed ? 100 - dotNode.ratio : dotNode.ratio;
        var edgePoint = this.edges.get(edge.id).pointsArr[current_ratio];
        if (edgePoint === undefined) {
            edgePoint = edge.edgeType.getPoint(current_ratio / 100);
            this.edges.get(edge.id).pointsArr[current_ratio] = edgePoint;
        }
        this.network.body.nodes[dotNode.id].x = edgePoint.x;
        this.network.body.nodes[dotNode.id].y = edgePoint.y;
    }

    /**
    * Updates the dot node with new source, target, and ratio values.
    * @param {object} node - The dot node object.
    * @param {string} from - The source node ID.
    * @param {string} to - The target node ID.
    * @param {number} ratio - The ratio value.
    * @returns {boolean} - Indicates if the update was successful.
    */
    updateDotNode(node, from, to, ratio = 0) {
        if (to === undefined || from === undefined) {
            return false;
        }
        var path = this.getEdgeConnectingNodes(from, to);
        if (path[0] === undefined) {
            console.log("No edge between the two given nodes: " + from + ", " + to);
            return false;
        }
        Object.assign(node, { ratio: ratio, source: from, target: to, edge: path[0], reversed: path[1] });
        return true;
    }

    /**
    * Creates a new dot node and adds it to the network.
    * @param {object} node - The dot node object containing properties such as ID, label, shape, size, and color.
    * @param {string} from - The source node ID.
    * @param {string} to - The target node ID.
    * @param {number} init_ratio - The initial ratio value.
    */
    createDotNode(node, from, to, init_ratio = 0) {
        var path = this.getEdgeConnectingNodes(from, to);
        if (path[0] === undefined) {
            console.log("No edge between the two given nodes: " + from + ", " + to);
            return;
        }

        var newDotNode = {
            id: node.id,
            label: node.label,
            shape: node.shape,
            edge: path[0],
            source: from,
            target: to,
            size: node.size,
            color: node.color,
            physics: false,
            group: 'movingdots',
            ratio: init_ratio,
            reversed: path[1],
            fixed: true,
        };

        var edge = this.network.body.edges[newDotNode.edge];
        var current_ratio = newDotNode.reversed ? 100 - newDotNode.ratio : newDotNode.ratio;
        var edgePoint = this.edges.get(edge.id).pointsArr[current_ratio];
        if (edgePoint === undefined) {
            edgePoint = edge.edgeType.getPoint(current_ratio / 100);
            this.edges.get(edge.id).pointsArr[current_ratio] = edgePoint;
        }
        newDotNode.x = edgePoint.x;
        newDotNode.y = edgePoint.y;

        this.dotNodes.add(newDotNode);
    }

    /**
    * Creates the edges table for efficient edge lookup.
    */
    createEdgesTable() {
        this.nodes.forEach((node) => {
            this.linksByEdges[node.id] = {};
        });

        this.edges.forEach((edge) => {
            this.linksByEdges[edge.from][edge.to] = edge.id;
            edge.pointsArr = {};
        });
    }

    /**
    * Retrieves the edge connecting two nodes.
    * @param {string} nodeId1 - The first node ID.
    * @param {string} nodeId2 - The second node ID.
    * @returns {array} - An array containing the edge ID and a flag indicating if the edge is reversed.
    */
    getEdgeConnectingNodes(nodeId1, nodeId2) {
        var edgeId = this.linksByEdges[nodeId1][nodeId2];
        if (edgeId !== undefined) {
            return [edgeId, false];
        }
        edgeId = this.linksByEdges[nodeId2][nodeId1];
        if (edgeId !== undefined) {
            return [edgeId, true];
        }
        return [undefined, undefined];
    }

    // Timing control events

    stopProcess() {
        cancelAnimationFrame(this.timer);
    }

    runProcess() {
        cancelAnimationFrame(this.timer);
        this.timer = requestAnimationFrame(this.loop); 
    }

    step() {
        this.moveDot(this.ratio_inc);
    }
}
  