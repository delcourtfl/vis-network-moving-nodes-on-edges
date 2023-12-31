# Vis-Network Moving Nodes Along The Edges

![Screenshot1](screenshot.gif)

This repository enables node moving animation along the edges of a network created with the Vis Network library.

## Demo

You can try the example [here](https://delcourtfl.github.io/vis-network-moving-nodes-on-edges/).

## Features

- SimpleMoveOnEdgeEngine : forward flow
- CompleteMoveOnEdgeEngine : forward and backward flow + event timing
- Works with physics enabled (thanks to some custom event)
- Customizable moving nodes

![Screenshot2](screenshotPhysics.gif)

## Custom Installation

1. Clone the repository.
2. Launch `python server.py` to create a small http server.
3. Open `http://localhost:8000/` in your preferred web browser (no online dependencies).

(Or just copy one of the two .js file in your project and load it)

## Usage

```javascript
    // network nodes
    var nodes = new vis.DataSet([
        {id: 1, label: 'Node 1'},
        {id: 2, label: 'Node 2'},
        {id: 3, label: 'Node 3'},
        {id: 4, label: 'Node 4'},
    ]);

    // moving nodes
    var dotNodes = new vis.DataSet([]);

    // network edges
    var edges = new vis.DataSet([
        {id: 1, _label: 'Edge 1', from: 1, to: 2, smooth: {enabled: false}},
        {id: 2, _label: 'Edge 2', from: 2, to: 3, smooth: {enabled: true, type: "bezier"}},
        {id: 3, _label: 'Edge 3', from: 3, to: 1, smooth: {enabled: true, type: "cubicBezier"}},
        {id: 4, _label: 'Edge 4', from: 3, to: 4, smooth: {enabled: false}},
    ]);

    // forwarding table : forwTable[current][from] = to
    var forwTable = {
        1: {3: 2, 2: 3},
        2: {1: 3, 3: 1},
        3: {2: 4, 1: 4},
        4: {},
    };

    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        "physics": {
            "enabled": false,
        },
        "configure": {
            "enabled": true,
            "container": config,
        },
    };
    var network = new vis.Network(container, data, options);

    var onEdgeEngine = new SimpleNodeOnEdgeEngine(network, nodes, dotNodes, edges, forwTable);
    onEdgeEngine.createEdgesTable();
    onEdgeEngine.initMovement();

    var movingNode = {
      id: "dot0",
      label: '',
      shape: 'dot',
      size: 6,
      color: {
          background: 'white',
          border: 'black'
      },
    }

    onEdgeEngine.createDotNode(movingNode, 2, 3);
```

## Technologies Used

- HTML, CSS, and JavaScript (+ Python for the simple webserver).
- [vis-network](https://github.com/visjs/vis-network) for network visualization.

## License

[MIT License](LICENSE)

## Resources

- Open issue of the old vis repository (https://github.com/almende/vis/issues/507)
- Old example of chap-links-library (http://almende.github.io/chap-links-library/js/network/examples/example02_shapes.html)
