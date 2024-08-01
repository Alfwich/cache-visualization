// CacheSimulator: Simulates a cache system
// 4/23/2015

CacheSimulator = function( cacheSize, blockSize, setSize, accessTime ) {
  if( !this.validInput( [ cacheSize, blockSize, setSize ] ) ) {
    blockSize = 1;
    cacheSize = 4;
    setSize = 2;
  }

  if( !this.validInput( [ accessTime ] ) ) {
    accessTime = 10;
  }

  // Attributes cacheSize, blockSize, and setSize need to be powers of 2 because
  // we are using bit-level addressing
  this.cacheSize = nearestPowerOfTwo( cacheSize );
  this.blockSize = nearestPowerOfTwo( blockSize );
  this.setSize = nearestPowerOfTwo( setSize );
  this.bitsForAddresses = 32;
  this.sets = []

  // Time metrics
  this.accessTime = accessTime;
  this.hits = 0;
  this.requests = 0;

  // Setup external variables for modifications. The view controller will connect to these values to allow
  // the user to modify the cache attributes without directly effecting the simulators behavior
  this.external = {
    blockSize : this.blockSize,
    cacheSize : this.cacheSize,
    setSize : this.setSize,
    accessTime : this.accessTime
  }

  // Clamp the setSize to be within the maximum blocksize
  if( this.setSize > this.cacheSize) {
    this.setSize = this.cacheSize;
  }

  // Add sets to the simulator based on cacheSize/setSize
  for( var setIndex = 0; setIndex < (this.cacheSize/this.setSize); setIndex++ ) {
    var set = {
      index  : setIndex,
      lru    : 0, // Hidden LRU for the set
      blocks : [],
    }

    // Add blocks to each set
    for( var block = 0; block < this.setSize; block++ ) {
      var data = [];

      // Add data entries to each block
      for( var i = 0; i < this.blockSize; i++ ) {
        data.push("-");
      }

      set.blocks.push( {
        index : block,
        tag   : "",
        data  : data,
        lru   : this.setSize-(block+1),
        address : 0,
        valid : 0,
        dirty : 0
      });
    }
    this.sets.push( set );
  }

}

// Checks each element of the args array for being defined and not NaN
// Returns false if either of these conditions are found on any element of the array
CacheSimulator.prototype.validInput = function( args ) {
  var result = true;

  for( var arg in args ) {
    arg = args[arg];
    if( typeof arg === "undefined" || parseInt(arg) === NaN ) {
      result = false;
      break;
    }
  }

  return result;
}

// Resolve a memory access
CacheSimulator.prototype.resolveRequest = function( address, nextCacheLevels, ignoreHit ) {
  var comps = this.getAddressComponents( parseInt( address ) ),
      hit = false,
      hitLru = 0;
      result = false;


  // Check to see if the data is within the block by comparing tags from each block in the set
  for( var block in this.sets[comps.set].blocks ) {
    block = this.sets[comps.set].blocks[block];

    // Hit!
    if( block.tag == comps.tag ) {
      hit = result = true;
      hitLru = block.lru;

      if( /w/g.test( address ) ) {
        block.dirty = 1;
      }

      break;
    }
  }

  // If we failed to find the data then add the request to the cache
  if( !hit ) {
    var block = this.sets[comps.set].blocks[this.sets[comps.set].lru];

    // If the block is valid and dirty then send a write request to the lower level if available
    if( block.valid && block.dirty && nextCacheLevels.length ) {
      nextCacheLevels[0].resolveRequest( block.address+"w", nextCacheLevels.slice(1), true );
    }

    // Write the data to the block
    block.dirty = 0;
    block.valid = 1;
    block.address = parseInt( address );
    block.tag = comps.tag;

    // Fill the block if there are more than one element
    if( this.blockSize > 1 ) {
      result = this.fillBlock( block.data, comps, nextCacheLevels );
    } else {
      block.data[comps.offset] = "*"+parseInt(address);

      // If there is a next cache level send off a request for the data
      if( nextCacheLevels.length > 0 ) {
        result = nextCacheLevels[0].resolveRequest( address, nextCacheLevels.slice(1) );
      }
    }
  }
  
  // If we hit then update the LURs based on the hit LRU making the hit block have LRU=0 and blocks with
  // LRU<hitLRU => LRU+=1
  var oldBlockLru = hit?hitLru:this.sets[comps.set].blocks[this.sets[comps.set].lru].lru;

  // Set the new LRUs for the blocks
  for( var blockIndex in this.sets[comps.set].blocks ) {
    var block = this.sets[comps.set].blocks[blockIndex];

    if( block.lru < oldBlockLru ) {
      block.lru++;
    } else if( block.lru == oldBlockLru ) {
      block.lru = 0;
    }

    if( block.lru == this.setSize-1) {
      this.sets[comps.set].lru = blockIndex;
    }
  }
  
  // if ignoreHit is Falsy then record the hit statistics
  if( !ignoreHit ) {
    this.requests++;
    if( hit ) {
      this.hits++;
    }
  }

  return result;
}

// Fills in the data array based on the address while making subsequent requests to lower cache levels if available
CacheSimulator.prototype.fillBlock = function( dataArray, comps, nextCacheLevels ) {
  var i = 0,
      entries = Math.pow( 2, comps.bitsForOffset ),
      higherOrderBits = comps.raw.substr( 0, this.bitsForAddresses-comps.bitsForOffset),
      ignore = false,
      result = false;

  // For each entry add the correct memory address to pull data from
  while( i < entries ) {
    var value = higherOrderBits + padLeft( decToBin( i ), comps.bitsForOffset );
    dataArray[i++] = "*"+parseInt( value, 2 );

    // If there is a next cache level send off a request for the data
    // ignore will get set to true which will only allow the lower level to recognize a single hit ( for hit-rate correctness )
    if( nextCacheLevels.length ) {
      var hit = nextCacheLevels[0].resolveRequest( parseInt( value, 2 ), nextCacheLevels.slice(1), ignore );

      // Only record a hit on the first access attempt; subsequent attempts will have the data populated as a side-effect of the request
      if( hit && i == 0 ) {
        result = hit;
      }

      ignore = true;
    }
  }

  return result;
}

// Returns the type of the cache:
// 0 : n-way set associative
// 1 : Fully Associative
// 2 : Direct Mapped
CacheSimulator.prototype.cacheType = function() {
  var cacheSimulator = this,
      result = 0;

  // Edge case when we only have a single block
  if( cacheSimulator.cacheSize == 1 ) {
    result = 2;

  // When we have a set size = cache size this is fully associative
  } else if( cacheSimulator.setSize == cacheSimulator.cacheSize ) {
    result = 1;

  // If the setSize is not 1 and not equal to the cache size then we are n-way set accociative
  } else if( cacheSimulator.setSize != 1 ) {
    result = 0;

  // If our setSize is 1 then we are direct mapped
  } else {
    result = 2;
  }

  return result;
}

// Returns the components of a provided address
CacheSimulator.prototype.getAddressComponents = function( address ) {
  var binAddress = padLeft(decToBin(address),this.bitsForAddresses),
      numberOfSets = this.cacheSize/this.setSize,
      bitsForSet = powOfTwo(numberOfSets),
      bitsForBlock = powOfTwo(this.blockSize),
      result = {
        tag : "",
        offset : 0,
        bitsForOffset : bitsForBlock,
        set : 0,
        bitsForSet : bitsForSet,
        raw : binAddress
      };

  // Process the number of bits for the offset within a block
  if( this.blockSize > 1 ) {
    result.offset = parseInt( binAddress.substr( binAddress.length-bitsForBlock, bitsForBlock), 2 );

    // Mutate the address to make further processing easier
    binAddress = binAddress.substr(0, binAddress.length-bitsForBlock);
  }

  // Process the set
  if( numberOfSets > 1 ) {
    result.set = parseInt( binAddress.substr( binAddress.length-bitsForSet, bitsForSet), 2 );

    binAddress = binAddress.substr(0, binAddress.length-bitsForSet );
  }

  // The rest of the address becomes the tag
  result.tag = binAddress;

  return result;
}




