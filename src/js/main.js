// Global application 
app = angular.module('cacheVisualizer', []);

// Utility functions

// Returns the nearest power of 2 based on the integer val
function nearestPowerOfTwo( val ) {
  var result = 0;
  
  result = Math.pow(2,Math.round(Math.log(parseInt(val))/Math.log(2)));

  return result;
}

// Returns the string representation of an integer in binary
function decToBin(dec) {
    return (dec >>> 0).toString(2);
}

// Returns a modified string nr padded out to n characters
function padLeft(nr, n, str){
    return Array(n-String(nr).length+1).join(str||'0')+nr;
}

// Returns the computation log_2(val)
function powOfTwo( val ) {
  var result = 0;
  result = Math.log(val)/Math.log(2);
  return result;
}
