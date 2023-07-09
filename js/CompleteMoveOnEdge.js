class CompleteNodeOnEdgeEngine {
    constructor(network, nodes, dotNodes, edges, forwTable) {
        this.network = network;
        this.nodes = nodes;
        this.edges = edges;
        this.dotNodes = dotNodes;
        this.forwTable = forwTable;


        this.linksByEdges = {};
        this.del_log_table = {};
        this.add_log_table = {};
        this.traces_table = {};
        this.edgesMoved = false;
        this.currentTime = 0;
        this.maxTime = 0;
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

        this.dotNodes.on('update', (event, properties, time) => {});

        this.dotNodes.on('add', (event, properties, time) => {
            properties.items.forEach((nodeId) => {
                var node = this.dotNodes.get(nodeId);
                if (this.traces_table[nodeId] === undefined || this.traces_table[nodeId].length == 0) {
                    this.traces_table[nodeId] = [node.source];
                }
                this.nodes.add(node);
            });
        });

        this.dotNodes.on('remove', (event, properties, time) => {
            properties.oldData.forEach((node) => {
                this.nodes.remove(node.id);
                if (this.ratio_inc >= 0) {
                    var entry = this.del_log_table[time];
                    if (entry === undefined) {
                        this.del_log_table[time] = [[node, node.source, node.target]];
                    } else {
                        entry.push([node, node.source, node.target]);
                    }
                } else {
                    var entry = this.add_log_table[time];
                    if (entry === undefined) {
                        this.add_log_table[time] = [[node, node.source, node.target]];
                    } else {
                        entry.push([node, node.source, node.target]);
                    }
                }
            });
        });

        this.timer = requestAnimationFrame(this.loop);
    }

    loop = (timestamp) => {
        const elapsed = timestamp - this.lastTime;
        if (elapsed >= this.targetInterval) {
          this.lastTime = timestamp;
          this.eventProcess();
        }
        this.timer = requestAnimationFrame(this.loop);
    };

    /**
     * Processes the movement events and updates the nodes on edges accordingly.
     */
    eventProcess() {
        var ratio = this.ratio_inc;

        if (ratio < 0) {
            this.moveDot(ratio, this.currentTime);
            this.currentTime = this.currentTime + this.time_delay * Math.sign(ratio);
            this.replayManager(this.currentTime, true);

            this.maxTime = Math.max(this.maxTime, this.currentTime);

        } else {
            this.moveDot(ratio, this.currentTime);
            this.currentTime = this.currentTime + this.time_delay * Math.sign(ratio);
            this.replayManager(this.currentTime, false);

            this.maxTime = Math.max(this.maxTime, this.currentTime);
        }

        document.getElementById("currenttime").innerHTML = this.currentTime/1000;
        document.getElementById("ratio_inc").innerHTML = this.ratio_inc/100;
        document.getElementById("maxtime").innerHTML = this.maxTime/1000;
    }

    /**
     * Manages the replay of events at a specific time.
     * @param {number} time - The time to replay the events.
     * @param {boolean} isReplay - Indicates if it's a replay in forward or backward direction.
     */
    replayManager(time, isReplay) {
        if (isReplay) {
            if (this.del_log_table[time] !== undefined) {
                this.del_log_table[time].forEach((event) => {
                    this.traces_table[event[0]].pop();
                    this.createDotNode(event[0], event[1], event[2], 100, time);
                });
                delete this.del_log_table[time];
            }
        } else {
            if (this.add_log_table[time] !== undefined) {
                this.add_log_table[time].forEach((event) => {
                    this.traces_table[event[0]].pop();
                    this.createDotNode(event[0], event[1], event[2], 0, time);
                });
                delete this.add_log_table[time];
            }
        }
    }

    /**
     * Moves the dot nodes on the edges based on the current ratio.
     * @param {number} current_ratio - The current ratio of the movement.
     * @param {number} time - The current time of the movement.
     */
    moveDot(current_ratio, time) {
        if (this.dotNodes.length <= 0) {
            return;
        }
        this.dotNodes.forEach((dotNode) => {
            dotNode.ratio += current_ratio;
            if (dotNode.ratio > 100) {
                this.traces_table[dotNode.id].push(dotNode.target);
                if (!this.updateDotNode(dotNode, dotNode.target, this.forwTable[dotNode.target][dotNode.source], dotNode.ratio - 100)) {
                    this.dotNodes.remove(dotNode, time);
                    return;
                }
            } else if (dotNode.ratio < 0) {
                this.traces_table[dotNode.id].pop();
                if (!this.updateDotNode(dotNode, this.traces_table[dotNode.id][this.traces_table[dotNode.id].length - 1], dotNode.source, 100 + dotNode.ratio)) {
                    this.dotNodes.remove(dotNode, time);
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
    * @param {number} time - The current time of the creation.
    */
    createDotNode(node, from, to, init_ratio = 0, time = 0) {
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

        this.dotNodes.add(newDotNode, time);
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

    forward() {
        this.ratio_inc = Math.abs(this.ratio_inc);
    }

    backward() {
        this.ratio_inc = -Math.abs(this.ratio_inc);
    }

    step() {
        this.eventProcess();
    }
}
  
