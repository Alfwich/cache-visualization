http://wuteri.ch/cache/

Cache Visualizations
====================
https://github.com/Alfwich/cache-visualization

Specifications
==============
20 points: Slide deck (same rules as your classmates, except you may have
slightly more slides if you choose)

80 points: Functionality and additional documentation
Documentation:
- A README suitable for future CS 351 students who want to use this tool.

*Functionality:*
==================

Build a web-based application that allows the user to specify the
following for an arbitrary number of cache levels:
* Total size of cache
* Block size (1, 2, or 4) <-- ideally an arbitrary power of 2, though
* Direct or 2-way set associative mapping <-- higher associatively, up to
full, is a bonus
* (bonus) Write policy
* (bonus) Access time (and access time for main memory)

The application should then provide a visualization of each cache's
organization, including metadata such as the valid bit, tag, LRU, and
dirty bit (if write-back is implemented). Index bits for each block should
be clearly shown.

The user should then be able to specify a sequence of memory references,
step through each one, and visualize the changes to the state of each
cache. The simulation should show the hit rate of each cache. If the
access time feature is implemented, the simulation should also show the
average memory access time for this sequence of requests.

Usage
======
On the initial launch of the simulator you will be presented with a single-level setup with only a L1 cache.
The left column allows you to configure the simulator:
* Address Sequence: Defines a sequence of memory addresses. You can define multiple addresses ( EX: 1, 20, 13 ) using space delimited values. Applying a 'w' either at the end of an address will constitute as a memory write.
* Process Address Button: Will take the left-most address in the Address Sequence and process it with the given cache.
* Repeat Addresses and Repeat Speed: Will repeat the address sequence provided. After each address is processed the address will be placed on the end of the address sequence. This allows you to run a sequence of addresses continuously. The Repeat Speed slider controls how fast the simulator will process the addresses [ 1ms - 1000ms ]
* Add New Cache to Stack: This will place a new cache level on the bottom of the current cache stack. 
* Update and Clear Cache: Clears all of the cache levels as well as updating their attributes

Overall cache information will be displayed within a table next. This shows access information about the entire cache and each level of the cache down to main memory. The entire cache system will be summarized on the last row.
* Level: The level of the cache
* Requests: The number of requests that the level has responded to.
* Hits: The number of requests that have been satisfied without sending a request down the memory hierarchy.
* Hit Rate: The % number of requests that have been a hit. Over time this number will stabilize to the hit-rate for the given cache and address sequence.
* Average Access Time: The average time the given level will take to responde to a request.

Each cache level will have their own set of attributes:
* Number of Blocks: The number of blocks.
* Block Size: The size of the data block.
* Set Size: The number of blocks in a set.
* Access Time: The time in ns that the cache will take to resolve a request.

By manipulating the Number of Blocks, Block Size, and Set Size you will be able to configure a cache into one of three categories:
* Direct Mapped: By setting the Set Size to 1 this will create a direct mapped cache.
* n-way Set Associative: By setting the Set Size within the range: ( 1, NumberOfBlocks ) will create a n-Way Set Associative cache.
* Fully Associative: By setting the Set Size to the number of blocks this will create a Fully Associative cache.


Implementation
==============
**Cache Simulator**: Responsible for modeling a single level of a cache. 
* CacheSimulator(): The prototype pattern is used to define cache simulators in the following manner: ``` var simulator = new CacheSimulator( {Cache Size}, {Block Size}, {Set Size}, {Access Time} ); ``` which will create a new cache simulator.
* CacheSimulator.resolveRequest( address, [nextCacheLevels], [ignoreHit] ): This will do a memory request on the given cache for the provided address. If the cache evicts dirty data, or does not have the requested data, then a request to the next cache levelwill be generated. The lower cache levels are passed into this function with the nextCacheLevels optional parameter( which is expecting an array of CacheSimulators ). If ignoreHit is truthy this will disable the recording of a hit/miss for the request. This is used when Block Size > 1 for populating the complete block.
* CacheSimulator.cacheType(): Returns the type of the cache: 0 = n-Way Set Associative, 1 = Fully Associative, 2 = Direct Mapped.
* CacheSimulator.getAddressComponents( address ): Returns an dictionary with the following attributes: tag, offset, set, raw. Each attribute will be the correct for the cache object.

**Tiered Cache**: Responsible for modeling a collection of cache levels.
* TieredCache(): The prototype pattern is used to define tiered caches in the following manner: ``` var tieredCache = new TieredCache( initalCache, memoryAccessTime ); ``` which will define a Tiered Cache with a single L1 level. The default main memory access time, provided by memoryAccessTime, is the time penalty for the entire Tiered Cache missing and having to access main memory.
* TieredCache.addCacheLevel( cacheSimulator ): This will push a new cache simulator on the bottom of the Tiered Cache stack.
* TieredCache.removeLevel( index ): Will remove a cache level at the provided stack index.
* TieredCache.clear(): This will reset the entire Tiered Cache and each cache level.
* TieredCache.averageAccessTime(): Returns the average access time for the entire cache.
* TieredCache.clearLevel( index ): Will clear the cache for the index on the cache stack.
* TieredCache.resolveRequest( address ): Will attempt to resolve the memory request on the given cache stack. This will call the resolveRequest function for the first given cache on the cache stack. Further memory calls are handled by the passing the cache stack through the cache calls removing the responding cache level progressively.

**View**: The view is structured within index.html and is separated within two partitions:
* The left column is the control column and is responsible for allowing the user to control the cache settings, and displaying the cache statistics.
* The right column is the visualization column and is responsible for displaying the contents within the cache simulator. There are three different views: Direct Mapped, n-Way Set Associative, and Fully Associative.

**View Controller**: The view controller, defined in controller.js, controls connecting the TieredCache and view controls. The view controller is also responsible for processing any view data before being applied to the view.
* processAddress(): Will take the current state of the addresses text field, process the field into memory references, and process the left-most address. After the address has been processed this will place the address on the end of the addresses field to allow continuous processing.
* cacheDescription( index ): Returns the description for a given cache simulator on the provided index for the cache stack.
* averageAccessTime(): Returns the average access time for the entire Tiered Cache.
* formattedHitRate( index ): Returns the hit rate for a given cache index on the cache stack formatted to two decimal places. If the index is invalid or undefined then this will return the hit rate for the entire Tiered Cache.
* renderBlockData( data ): Will return a formatted string for a cache block. EX: [ "*1", "*2", "*3", "*4" ] => "[ *1, *2, *3, *4 ]".
* clearCacheLevel( index ): Will clear and update the cache provided by the index on the cache stack.
* initCache(): Will create a new Cache Simulator and place on the bottom of the cache stack.
* removeCacheLevel( index ): Will remove the given cache provided by the index on the cache stack.
* repeatAddressSequence(): This will start an interval for processing addresses or will stop the current interval.
