

Summary :
Events : Add & Remove
    Two dictionaries : one for the Add, one for the Remove
Timebased : timestamp for each iteration of the main loop
ForwTable : redirect node according to its position and source
Traces_table : list of the nodes visited by a moving dot

In loop :
    Get Time => Do action (move) => Read event to add node => Increment time

    Can be reversed :

    Get time => Do action (move) => Read event to add node => Decrement time

    + : 2000, end of path, remove node
    - : 2000, has event, add node

Logging :
    Event 

    ADD : Create node method

    REMOVE : on end of path by checking dotnodes.remove()

https://github.com/almende/vis/issues/507