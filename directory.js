const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const split2 = require('split2');

const DATA_PATH = './data/instructions.txt';
const FILE_SPLIT_REGEX = /\r?\n/;
const PATH_SEPERATOR = '/';


/**
 * DirectoryList
 */
class DirectoryList {
  constructor(type, name) {
    this.type = type;
    this.name = name;
    this.children = [];
  }

  create(path, orphanNode = null) {
    const workingPath = path.slice();
    let currNode;

    if (workingPath.length === 0) return;

    // Does root directory exists
    currNode = this.children.find((child) => {
      if (child.name === workingPath[0]) {
        return true;
      }
      return false;
    });


    if (currNode && !orphanNode) {
      // root exists
      // remove verified root from workingPath
      workingPath.shift();
      // does this path exist
      if (!currNode.contains(workingPath)) {
        // path does not exist, create
        currNode.create(workingPath, orphanNode);
      }
    } else if (currNode && orphanNode) {
      // move operation of existing node
      currNode.children.push(orphanNode);
    } else {
      // create full path
      const newNode = new DirectoryList('directory', workingPath.shift());
      newNode.create(workingPath, orphanNode);
      this.children.push(newNode);
    }
    
  }

  deleteChild(path) {
    const workingPath = path.slice();
    let searchPathName = workingPath.shift();

    for (let i = 0; i < this.children.length; i += 1){
      if (searchPathName === this.children[i].name && workingPath.length === 0) {
        // remove child
        return this.children.splice(i, 1);
      }
      this.children[i].deleteChild(workingPath);
    }
  }

  delete(path) {
    const workingPath = path.slice();
    let currNode;

    if (workingPath.length === 0) return;

    // Does root directory exists
    currNode = this.children.find((child) => {
      if (child.name === workingPath[0]) {
        return true;
      }
      return false;
    });

    
    if (workingPath.length === 1 && currNode) {
      // Is currNode the target
      return this.deleteChild(workingPath);
    } else if (currNode && currNode.contains(workingPath)) {
      // exists
      workingPath.shift();
      return currNode.deleteChild(workingPath);
    } else {
      // not found
      let message = 'Cannont delete ' + path.join(PATH_SEPERATOR) + ' - does not exist\n';
      process.stdout.write(message);
    }
  }

  move (fromPath, toPath) {
    // delete path
    let currNode = this.delete(fromPath);
  
    // create new path
    if (currNode) {
      [currNode] = currNode;
      this.create(toPath, currNode);
    }
  }

  list (level = 0) {
    let record;

    // sort children alphabetically
    this.children.sort((a, b) => {
      if (a.name < b.name) return -1;
      return 1;
    });

    // print each child node
    for (let i = 0; i < this.children.length; i += 1) {
      record = ' '.repeat(level) + this.children[i].name + '\n';
      process.stdout.write(record);
      // print any grandchildren nodes
      this.children[i].list(level + 1);
    }
  }

  contains (path) {
    const workingPath = path.slice();

    if (workingPath.shift() === this.name && workingPath.length === 0) return true;

    for (let i = 0; i < this.children.length; i += 1){
      return this.children[i].contains(workingPath);
    }
    // not found
    return false;
  }
}


/**
 * directory - Module to read thru an instruction file
 *             for create, move, delete and list directories
 */
const directory = () => {
  // read in instructions
  const instructionsStream = fs.createReadStream(path.resolve(__dirname, DATA_PATH));
  // directory list
  const directoryList = new DirectoryList('container', 'root');


  /**
   * processCommand - Transform stream to process each record and 
   *                  interpret/translate the commands and parameters
   */
  const processCommand = new Transform(
    {
      readableObjectMode: true,
      writableObjectMode: true,
      transform(record, encoding, callback) {
        const recordAsArray = record.toString().split(' ');
        // if empty line, ignore and move to next record
        if (recordAsArray.length > 0) {
          let command = recordAsArray[0].toUpperCase();
          let params = recordAsArray.slice(1);

          let message = `${command} ${params.join(' ')}\n`;
          process.stdout.write(message);

          switch (command) {
            case 'CREATE':
              directoryList.create(params[0].split(PATH_SEPERATOR));
              break;
            case 'DELETE':
              directoryList.delete(params[0].split(PATH_SEPERATOR));
              break;
            case 'MOVE':
              directoryList.move(params[0].split(PATH_SEPERATOR), params[1].split(PATH_SEPERATOR));
              break;
            case 'LIST':
              directoryList.list();
              break;
          }
        }
        callback();
      },
    },
  );

  // process instructions
  instructionsStream
  .pipe(split2(FILE_SPLIT_REGEX))
  .pipe(processCommand);
  
};

// initiate processing
directory();

module.exports = directory;
