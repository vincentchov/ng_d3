var app = angular.module('plunker', []);

app.controller('MainCtrl', ['$scope', '$http', function($scope, $http) {
  
  var ctrl = this;
  ctrl.foo = 'bar!';
  $http.get('hierarchy.json')
    .then(function success(data) {
      console.log(data);
      // ctrl.diagramData = data.data; 
    });
    
  $http.get('order-fill-data.json')
    .then(function success(data) {
      console.log(data); 
      ctrl.orderShorts = data.data; 
      var copy = angular.copy(ctrl.orderShorts);
      
      ctrl.diagramData = buildDiagramData(copy, 'Order Shorts');
    });
    
  function buildDiagramData(dataset, parentName) {
    var parentObj = {
      category: parentName,
      count: dataset.length,
      valueType: 'Total ' + parentName,
      children: []
    };
    var types = [];
    var rootCauses = {};
    _.forEach(dataset, function(item) {
      if (!!(~types.indexOf(item.type)))  {
        var thisChild = _.find(parentObj.children, { category: item.type });
        thisChild.count++;
        
        if (!!(~rootCauses[item.type].indexOf(item.root_cause))) {
          var thisGrandchild = _.find(thisChild.children, { category: item.root_cause });
          thisGrandchild.count++;
        } else {
          rootCauses[item.type].push(item.root_cause);
          thisChild.children.push({
            category: item.root_cause,
            count: 1
          });
        } 
      } else {
        types.push(item.type);
        rootCauses[item.type] = [];
        rootCauses[item.type].push(item.root_cause);
        parentObj.children.push({
          category: item.type, 
          count: 1,
          children: [{
            category: item.root_cause,
            count: 1
          }]
        });
      } 
    }); 

    return parentObj;
  }
  
  var currGridKey = '';
   
  $scope.$on('child directive change grid data', function(event, args) {
    console.log('parent controller heard directive broadcast!');
    console.log('chart sent data with broadcast:', args.data);
    if (currGridKey === args.data) {
      console.log('no grid change!');
    } else {
      currGridKey = args.data;
      console.log('GRID CHANGE!', currGridKey);
    }
  });
}]); 

app.directive('collapsibleTree', ['$window', '$filter', function($window, $filter) {
  
  var link = function(scope, elem, attrs, controller) {
    
      window.onresize = function() {
        // console.log('window resize event!');
        scope.$apply();
      };
      
      console.log('directive\'s controller:', controller);
      console.log('directive scope\'s parent:', scope.$parent.foo);
  
      // console.log('datasource is: ' + JSON.stringify(scope.data));

      var totalItems = scope.data.count;
      console.log('total items of data:', totalItems);
      
      var margin = {top: 20, right: 120, bottom: 20, left: 120},
          width = 960 - margin.right - margin.left,
          height = 600 - margin.top - margin.bottom;
      
      var i = 0, 
          duration = 750,
          root;
          
      var formatPct = function(val) {
        return $filter('percentage')(val, 2);
      };
      
      var tree = d3.layout.tree()
          .size([height, width]);
      
      var diagonal = d3.svg.diagonal()
          .projection(function(d) { return [d.y, d.x]; });
      
      var svg = d3.select('body').append('svg')
          .attr('width', width + margin.right + margin.left)
          .attr('height', height + margin.top + margin.bottom)
        .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
          
      var fixedHTMLtooltip = d3.select('body').append('div')
        .attr('class', 'tree-diagram-tooltip fixed')
        .style('opacity', 0);
      
      var tooltipDiv = d3.select('body').append('div')	
        .attr('class', 'tree-diagram-tooltip')				
        .style('opacity', 0);

      root = angular.copy(scope.data);
      root.x0 = height / 2;
      root.y0 = 0;
      
      function collapse(d) {
        if (d.children) {
          d._children = d.children;
          d._children.forEach(collapse);
          d.children = null;
        }
      }
      
      // <i class="fa fa-table" aria-hidden="true"></i>
      root.children.forEach(collapse);
      update(root);
      
      d3.select(self.frameElement).style('height', '800px');
      
      function update(source) {
      
        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);
      
        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 180; });
      
        // Update the nodes…
        var node = svg.selectAll('g.node')
          .data(nodes, function(d) { return d.id || (d.id = ++i); });
      
        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
          .attr('class', 'node')
          .attr('transform', function(d) { return 'translate(' + source.y0 + ',' + source.x0 + ')'; })
          .on('click', click);
      
        // add picture
        nodeEnter
          .append('defs')
          .append('pattern')
          .attr('id', function(d,i){
            return 'node_' + d.category;
          })
          .attr('height',function(d,i){
            return 100*Math.pow(d.count/totalItems, 0.5);
          })
          .attr('width',function(d,i){
            return 100*Math.pow(d.count/totalItems, 0.5);
          })
          .attr('x',0)
          .attr('y',0)
          .attr('height', function(d,i){
            return 100*Math.pow(d.count/totalItems, 0.5);
          })
          .attr('width', function(d,i){
            return 100*Math.pow(d.count/totalItems, 0.5);
          })
          .attr('x',0)
          .attr('y',0);
      
        nodeEnter.append('circle')
          .attr('r', 1e-6)
          .style('fill', function(d) { return d._children ? 'lightsteelblue' : '#fff'; })
          .on('mouseover', function(d) {	
            var matrix = this.getScreenCTM()
                .translate(+this.getAttribute('cx'),
                           +this.getAttribute('cy'));
                         
            var radius = +this.getAttribute('r'),
                tempRad = theLargerOf(radius, 56);
            
            console.log('circle radius:', radius);
            console.log('tooltip matrix', matrix);   
            
            fixedHTMLtooltip 
              .transition()		
              .duration(200)		
              .style('opacity', .9);		
              
            fixedHTMLtooltip 
              .html(formatPct(d.count/totalItems))	
              .style('left', (matrix.e-0.5*theLargerOf((1.5*radius), 84)) + 'px')
              .style('top', (matrix.f-(1.5*radius)) + 'px')
              .style('width', theLargerOf((1.5*radius), 84) + 'px');
    
          })					
          .on('mouseout', function(d) {		
            fixedHTMLtooltip
              .transition()		
              .duration(500)		
              .style('opacity', 0);	
          });
    
        var g = nodeEnter.append('g');
        
        g.append('text')
          .attr('x', function(d) { return d.children || d._children ? 50 + ((d.category.length - 10)*5) : -50 - ((d.category.length - 10)*5); })
          .attr('dy', '0.5em')
          .attr('text-anchor', function(d) { return d.children || d._children ? 'end' : 'start'; })
          .text(function(d) { return d.category; })
          .style('background-color', '#ddd')
          .style('font-size', '1.25em')
          .style('fill-opacity', 1e-6);
            
        g.append('text')
          .attr('x', function(d) { return d.children || d._children ? -30 : -30; })
          .attr('dy', '2em')
          .attr('class', 'total')
          .attr('text-anchor', 'start')
          .text(function(d) { return 'Total: ' + d.count; })
          .style('fill-opacity', 1e-6)
          .selectAll("total text")
            .call(wrap, 30);
      
        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
          .duration(duration)
          .attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; });
      
        nodeUpdate.select('circle')
          .attr('r', function(d,i){
            return 100*Math.pow(d.count/totalItems, 0.5);
          })
          .style('fill', function(d,i){
            return 'rgb(' + 150 + ', ' + (d.count/totalItems)*255 + ', ' + 150 + ')';
          })
          .style('fill-opacity', function(d,i){
            return d.value;
          });  
       
        nodeUpdate.selectAll('text')
          .style('fill-opacity', 1);
      
        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
          .duration(duration)
          .attr('transform', function(d) { return 'translate(' + source.y + ',' + source.x + ')'; })
          .remove();
      
        nodeExit.select('circle')
          .attr('r', 1e-6);
      
        nodeExit.select('text')
          .style('fill-opacity', 1e-6);
      
        // Update the links…
        var link = svg.selectAll('path.link')
          .data(links, function(d) { return d.target.id; });
      
        // Enter any new links at the parent's previous position.
        link.enter().insert('path', 'g')
          .attr('class', 'link')
          .attr('d', function(d) {
            var o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
          });
      
        // Transition links to their new position.
        link.transition()
          .duration(duration)
          .attr("d", diagonal);
      
        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
          .duration(duration)
          .attr('d', function(d) {
            var o = { x: source.x, y: source.y };
            return diagonal({ source: o, target: o });
          })
          .remove();
        
        // Stash the old positions for transition.
        nodes.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }
      
      // Toggle children on click.
      function click(d) {
        scope.$emit('child directive change grid data', { data: d.category });
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(d);
      }
      
      function wrap(text, width) {
        text.each(function() {
          var text = d3.select(this),
              words = text.text().split(/\s+/).reverse(),
              word,
              line = [],
              lineNumber = 0,
              lineHeight = 1.1, // ems
              y = text.attr("y"),
              dy = parseFloat(text.attr("dy")),
              tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
          while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
              tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
          }
        });
      }
      
      function theLargerOf(val1, val2) {
        return val1 >= val2 ? val1 : val2;
      }
    
    };
    
    return {
      restrict: 'E', // Directive Scope is Element,
      scope: {
        data: '='
      },
      link: link
    };

}]);

app.filter('percentage', ['$filter', function($filter) {

  return function (input, decimals) {
    return $filter('number')(input * 100, decimals) + '%';
  };

}]);
  
  
  