/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */

angular.module("D3Angular", []);

angular.module("D3Angular").controller("MainCtrl", [
    "$scope",
    "$http",
    function($scope, $http) {
        const ctrl = this;
        ctrl.foo = "bar!";
        $http.get("hierarchy.json").then(function success(data) {
            console.log(data);
            // ctrl.diagramData = data.data;
        });

        $http.get("order-fill-data.json").then(function success(data) {
            console.log(data);
            ctrl.orderShorts = data.data;
            const copy = angular.copy(ctrl.orderShorts);

            ctrl.diagramData = buildDiagramData(copy, "Order Shorts");
        });

        function buildDiagramData(dataset, parentName) {
            const parentObj = {
                category: parentName,
                count: dataset.length,
                valueType: `Total ${parentName}`,
                children: []
            };
            const types = [];
            const rootCauses = {};
            _.forEach(dataset, function(item) {
                if (~types.indexOf(item.type)) {
                    const thisChild = _.find(parentObj.children, {
                        category: item.type
                    });
                    thisChild.count += 1;

                    if (~rootCauses[item.type].indexOf(item.root_cause)) {
                        const thisGrandchild = _.find(thisChild.children, {
                            category: item.root_cause
                        });
                        thisGrandchild.count += 1;
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
                        children: [
                            {
                                category: item.root_cause,
                                count: 1
                            }
                        ]
                    });
                }
            });

            return parentObj;
        }

        let currGridKey = "";

        $scope.$on("child directive change grid data", function(event, args) {
            console.log("parent controller heard directive broadcast!");
            console.log("chart sent data with broadcast:", args.data);
            if (currGridKey === args.data) {
                console.log("no grid change!");
            } else {
                currGridKey = args.data;
                console.log("GRID CHANGE!", currGridKey);
            }
        });
    }
]);

angular.module("D3Angular").directive("collapsibleTree", [
    "$window",
    "$filter",
    function($window, $filter) {
        const linkFn = function(scope, elem, attrs, controller) {
            window.onresize = function() {
                // console.log('window resize event!');
                scope.$apply();
            };

            console.log("directive's controller:", controller);
            console.log("directive scope's parent:", scope.$parent.foo);

            // console.log('datasource is: ' + JSON.stringify(scope.data));

            const totalItems = scope.data.count;
            console.log("total items of data:", totalItems);

            const margin = { top: 20, right: 120, bottom: 20, left: 120 };
            const width = 960 - margin.right - margin.left;
            const height = 600 - margin.top - margin.bottom;

            let i = 0;
            const duration = 750;

            const formatPct = function(val) {
                return $filter("percentage")(val, 2);
            };

            const tree = d3.layout.tree().size([height, width]);

            const diagonal = d3.svg.diagonal().projection(function(d) {
                return [d.y, d.x];
            });

            const svg = d3
                .select("body")
                .append("svg")
                .attr("width", width + margin.right + margin.left)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const fixedHTMLtooltip = d3
                .select("body")
                .append("div")
                .attr("class", "tree-diagram-tooltip fixed")
                .style("opacity", 0);

            const root = angular.copy(scope.data);
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

            d3.select(self.frameElement).style("height", "800px");

            function update(source) {
                // Compute the new tree layout.
                const nodes = tree.nodes(root).reverse();
                const links = tree.links(nodes);

                // Normalize for fixed-depth.
                nodes.forEach(function(d) {
                    d.y = d.depth * 180;
                });

                // Update the nodes…
                const node = svg.selectAll("g.node").data(nodes, function(d) {
                    if (!d.id) {
                        i += 1;
                        d.id = i;
                    }

                    return d.id;
                });

                // Enter any new nodes at the parent's previous position.
                const nodeEnter = node
                    .enter()
                    .append("g")
                    .attr("class", "node")
                    .attr("transform", function() {
                        return `translate(${source.y0},${source.x0})`;
                    })
                    .on("click", click);

                // add picture
                nodeEnter
                    .append("defs")
                    .append("pattern")
                    .attr("id", function(d) {
                        return `node_${d.category}`;
                    })
                    .attr("height", function(d) {
                        return 100 * (d.count / totalItems) ** 0.5;
                    })
                    .attr("width", function(d) {
                        return 100 * (d.count / totalItems) ** 0.5;
                    })
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("height", function(d) {
                        return 100 * (d.count / totalItems) ** 0.5;
                    })
                    .attr("width", function(d) {
                        return 100 * (d.count / totalItems) ** 0.5;
                    })
                    .attr("x", 0)
                    .attr("y", 0);

                nodeEnter
                    .append("circle")
                    .attr("r", 1e-6)
                    .style("fill", function(d) {
                        return d._children ? "lightsteelblue" : "#fff";
                    })
                    .on("mouseover", function(d) {
                        const matrix = this.getScreenCTM().translate(
                            +this.getAttribute("cx"),
                            +this.getAttribute("cy")
                        );

                        const radius = +this.getAttribute("r");

                        console.log("circle radius:", radius);
                        console.log("tooltip matrix", matrix);

                        fixedHTMLtooltip
                            .transition()
                            .duration(200)
                            .style("opacity", 0.9);

                        fixedHTMLtooltip
                            .html(formatPct(d.count / totalItems))
                            .style(
                                "left",
                                `${matrix.e -
                                    0.5 * theLargerOf(1.5 * radius, 84)}px`
                            )
                            .style("top", `${matrix.f - 1.5 * radius}px`)
                            .style(
                                "width",
                                `${theLargerOf(1.5 * radius, 84)}px`
                            );
                    })
                    .on("mouseout", function() {
                        fixedHTMLtooltip
                            .transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                const g = nodeEnter.append("g");

                g.append("text")
                    .attr("x", function(d) {
                        return d.children || d._children
                            ? 50 + (d.category.length - 10) * 5
                            : -50 - (d.category.length - 10) * 5;
                    })
                    .attr("dy", "0.5em")
                    .attr("text-anchor", function(d) {
                        return d.children || d._children ? "end" : "start";
                    })
                    .text(function(d) {
                        return d.category;
                    })
                    .style("background-color", "#ddd")
                    .style("font-size", "1.25em")
                    .style("fill-opacity", 1e-6);

                g.append("text")
                    .attr("x", function(d) {
                        return d.children || d._children ? -30 : -30;
                    })
                    .attr("dy", "2em")
                    .attr("class", "total")
                    .attr("text-anchor", "start")
                    .text(function(d) {
                        return `Total: ${d.count}`;
                    })
                    .style("fill-opacity", 1e-6)
                    .selectAll("total text")
                    .call(wrap, 30);

                // Transition nodes to their new position.
                const nodeUpdate = node
                    .transition()
                    .duration(duration)
                    .attr("transform", function(d) {
                        return `translate(${d.y},${d.x})`;
                    });

                nodeUpdate
                    .select("circle")
                    .attr("r", function(d) {
                        return 100 * (d.count / totalItems) ** 0.5;
                    })
                    .style("fill", function(d) {
                        return `rgb(${150}, ${(d.count / totalItems) * 255}, ${150})`;
                    })
                    .style("fill-opacity", function(d) {
                        return d.value;
                    });

                nodeUpdate.selectAll("text").style("fill-opacity", 1);

                // Transition exiting nodes to the parent's new position.
                const nodeExit = node
                    .exit()
                    .transition()
                    .duration(duration)
                    .attr("transform", function() {
                        return `translate(${source.y},${source.x})`;
                    })
                    .remove();

                nodeExit.select("circle").attr("r", 1e-6);

                nodeExit.select("text").style("fill-opacity", 1e-6);

                // Update the links…
                const link = svg
                    .selectAll("path.link")
                    .data(links, function(d) {
                        return d.target.id;
                    });

                // Enter any new links at the parent's previous position.
                link.enter()
                    .insert("path", "g")
                    .attr("class", "link")
                    .attr("d", function() {
                        const o = { x: source.x0, y: source.y0 };
                        return diagonal({ source: o, target: o });
                    });

                // Transition links to their new position.
                link.transition()
                    .duration(duration)
                    .attr("d", diagonal);

                // Transition exiting nodes to the parent's new position.
                link.exit()
                    .transition()
                    .duration(duration)
                    .attr("d", function() {
                        const o = { x: source.x, y: source.y };
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
                scope.$emit("child directive change grid data", {
                    data: d.category
                });
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                update(d);
            }

            function wrap(textToWrap, widthToSet) {
                textToWrap.each(function() {
                    const text = d3.select(this);
                    const words = text
                        .text()
                        .split(/\s+/)
                        .reverse();
                    let word;
                    let line = [];
                    let lineNumber = 0;
                    const lineHeight = 1.1; // ems
                    const y = text.attr("y");
                    const dy = parseFloat(text.attr("dy"));
                    let tspan = text
                        .text(null)
                        .append("tspan")
                        .attr("x", 0)
                        .attr("y", y)
                        .attr("dy", `${dy}em`);

                    while (words.length) {
                        word = words.pop();
                        line.push(word);
                        tspan.text(line.join(" "));
                        if (tspan.node().getComputedTextLength() > widthToSet) {
                            line.pop();
                            tspan.text(line.join(" "));
                            line = [word];
                            lineNumber += 1;
                            tspan = text
                                .append("tspan")
                                .attr("x", 0)
                                .attr("y", y)
                                .attr("dy", `${lineNumber * lineHeight + dy}em`)
                                .text(word);
                        }
                    }
                });
            }

            function theLargerOf(val1, val2) {
                return val1 >= val2 ? val1 : val2;
            }
        };

        return {
            restrict: "E", // Directive Scope is Element,
            scope: {
                data: "="
            },
            link: linkFn
        };
    }
]);

angular.module("D3Angular").filter("percentage", [
    "$filter",
    function($filter) {
        return function(input, decimals) {
            return `${$filter("number")(input * 100, decimals)}%`;
        };
    }
]);
