// TieredCache: Controls the interface to a tiered collection of CacheSimulatory
// 4/23/2015

TieredCache = function( initalCache, memoryAccessTime ) {
  this.cacheLevels = [ initalCache ];
  this.mainMemoryAccessTime = memoryAccessTime;
  this.mainMemoryAccesses = 0;
  this.requests = 0;
  this.hits = 0;
  this.externals = {
    mainMemoryAccessTime : this.mainMemoryAccessTime
  };
}

// Pushes a cache level onto the cache stack
TieredCache.prototype.addCacheLevel = function( cacheSimulator ) {
  this.cacheLevels.push( cacheSimulator );
}

// Remove an arbitrary level from the cache stack 
TieredCache.prototype.removeLevel = function( index ) {
  if( typeof this.cacheLevels[level] !== "undefined" ) {
    this.cacheLevels.splice( index, 1 );
  }
}

// Clears and updates all CacheSimulators on the stack
// also enforces any simulator dependent constraints
TieredCache.prototype.clear = function() {
  this.mainMemoryAccesses = 0;
  this.requests = 0;
  this.hits = 0;
  this.mainMemoryAccessTime = this.externals.mainMemoryAccessTime;
  if( this.cacheLevels.length ) {

    var lastBlockSize = this.cacheLevels[0].external.blockSize;
    for( var level in this.cacheLevels ) {
      // If the last block size is less than the previous set the current block size to the previous level
      // this code works because we are traversing the levels from L1, L2, ... , Ln
      if( this.cacheLevels[level].external.blockSize < lastBlockSize ) {
        this.cacheLevels[level].external.blockSize = lastBlockSize;
      } else {
        lastBlockSize = this.cacheLevels[level].external.blockSize;
      }

      this.clearLevel( level );
    }
  }
}

// Returns the average access time for the entire tiered cache
TieredCache.prototype.averageAccessTime = function() {
  var time = 0;

  // Sum all of the accesses
  time += this.mainMemoryAccesses*this.mainMemoryAccessTime;

  for( var level in this.cacheLevels ) {
    var cacheSimulator = this.cacheLevels[level];
    time += cacheSimulator.requests * cacheSimulator.accessTime;
  }

  return time/this.requests;
}

// Clears and updates a single level on the cache stack
TieredCache.prototype.clearLevel = function( index ) {
  if( typeof this.cacheLevels[index] !== "undefined" ) {
    var cacheSimulator = this.cacheLevels[index];

    // Create a new cache simulator for the block using the external variables
    this.cacheLevels[index] = new CacheSimulator( cacheSimulator.external.cacheSize, cacheSimulator.external.blockSize, cacheSimulator.external.setSize, cacheSimulator.external.accessTime );
  }
}

// Resolve a memory request by querying the lowest level caches first and sequentially 
// querying the next higher level(s).
TieredCache.prototype.resolveRequest = function( address ) {

  this.requests++;

  // If we do not have any cache levels then every request will access main memory
  // else send the request to the first cache level which will handle calling the 
  // lower cache levels for the data if needed
  if( this.cacheLevels.length != 0 ) {
    if( !this.cacheLevels[0].resolveRequest( address, this.cacheLevels.slice(1) ) ) {
      this.mainMemoryAccesses++;
    } else {
      this.hits++;
    };
  } else {
    this.mainMemoryAccesses++;
  }
}
