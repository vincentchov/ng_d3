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
            ctrl.diagramData = data.data;
        });

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

class D3Tree {
    constructor(treeData, margin, width, height, $filter, $scope) {
        this.$filter = $filter;
        this.$scope = $scope;

        this.dimensions = {
            margin: margin,
            width: width,
            height: height
        };

        this.newestNodeId = 0;
        this.animationDuration = 750;
        this.totalItems = this.$scope.data.count;

        this.treeVisual = d3.layout
            .tree()
            .size([this.dimensions.height, this.dimensions.width]);

        this.svg = d3
            .select("body")
            .append("svg")
            .attr(
                "width",
                this.dimensions.width +
                    this.dimensions.margin.right +
                    this.dimensions.margin.left
            )
            .attr(
                "height",
                this.dimensions.height +
                    this.dimensions.margin.top +
                    this.dimensions.margin.bottom
            )
            .append("g")
            .attr(
                "transform",
                `translate(${this.dimensions.margin.left},${
                    this.dimensions.margin.top
                })`
            );

        this.drawDiagonal = d3.svg.diagonal().projection(d => [d.y, d.x]);

        // eslint-disable-next-line prefer-destructuring
        this.root = angular.copy(treeData);
        this.root.prevX = this.dimensions.height / 2;
        this.root.prevY = 0;

        d3.select(window.self.frameElement).style("height", "800px");
    }

    updateNodes(nodes, source) {
        // Update the nodes…
        const node = this.svg.selectAll("g.node").data(nodes, d => {
            if (!d.id) {
                this.newestNodeId += 1;
                d.id = this.newestNodeId;
            }

            return d.id;
        });
        const fixedHTMLtooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tree-diagram-tooltip fixed")
            .style("opacity", 0);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", () => {
                return `translate(${source.prevY},${source.prevX})`;
            })
            .on("click", d => {
                this.$scope.$emit("child directive change grid data", {
                    data: d.category
                });
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                this.updateTree(d);
            });

        // add picture
        nodeEnter
            .append("defs")
            .append("pattern")
            .attr("id", d => {
                return `node_${d.category}`;
            })
            .attr("height", d => {
                return 100 * (d.count / this.totalItems) ** 0.5;
            })
            .attr("width", d => {
                return 100 * (d.count / this.totalItems) ** 0.5;
            })
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", d => {
                return 100 * (d.count / this.totalItems) ** 0.5;
            })
            .attr("width", d => {
                return 100 * (d.count / this.totalItems) ** 0.5;
            })
            .attr("x", 0)
            .attr("y", 0);

        const formatPct = val => {
            return this.$filter("percentage")(val, 2);
        };

        const { totalItems } = this;

        nodeEnter
            .append("circle")
            .attr("r", 1e-6)
            .style("fill", d => {
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
                        `${matrix.e - 0.5 * Math.max(1.5 * radius, 84)}px`
                    )
                    .style("top", `${matrix.f - 1.5 * radius}px`)
                    .style("width", `${Math.max(1.5 * radius, 84)}px`);
            })
            .on("mouseout", () => {
                fixedHTMLtooltip
                    .transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        const g = nodeEnter.append("g");

        g.append("text")
            .attr("x", d => {
                return d.children || d._children
                    ? 50 + (d.category.length - 10) * 5
                    : -50 - (d.category.length - 10) * 5;
            })
            .attr("dy", "0.5em")
            .attr("text-anchor", d => {
                return d.children || d._children ? "end" : "start";
            })
            .text(d => {
                return d.category;
            })
            .style("background-color", "#ddd")
            .style("font-size", "1.25em")
            .style("fill-opacity", 1e-6);

        g.append("text")
            .attr("x", d => {
                return d.children || d._children ? -30 : -30;
            })
            .attr("dy", "2em")
            .attr("class", "total")
            .attr("text-anchor", "start")
            .text(d => {
                return `Total: ${d.count}`;
            })
            .style("fill-opacity", 1e-6)
            .selectAll("total text")
            .call(
                function(textToWrap, widthToSet) {
                    textToWrap.each(() => {
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
                            if (
                                tspan.node().getComputedTextLength() >
                                widthToSet
                            ) {
                                line.pop();
                                tspan.text(line.join(" "));
                                line = [word];
                                lineNumber += 1;
                                tspan = text
                                    .append("tspan")
                                    .attr("x", 0)
                                    .attr("y", y)
                                    .attr(
                                        "dy",
                                        `${lineNumber * lineHeight + dy}em`
                                    )
                                    .text(word);
                            }
                        }
                    });
                },

                30
            );

        // Transition nodes to their new position.
        const nodeUpdate = node
            .transition()
            .duration(this.animationDuration)
            .attr("transform", d => {
                return `translate(${d.y},${d.x})`;
            });

        nodeUpdate
            .select("circle")
            .attr("r", d => {
                return 100 * (d.count / this.totalItems) ** 0.5;
            })
            .style("fill", d => {
                return `rgb(${150}, ${(d.count / this.totalItems) *
                    255}, ${150})`;
            })
            .style("fill-opacity", d => {
                return d.value;
            });

        nodeUpdate.selectAll("text").style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        const nodeExit = node
            .exit()
            .transition()
            .duration(this.animationDuration)
            .attr("transform", () => {
                return `translate(${source.y},${source.x})`;
            })
            .remove();

        nodeExit.select("circle").attr("r", 1e-6);

        nodeExit.select("text").style("fill-opacity", 1e-6);
    }

    updateLinks(links, source) {
        // Update the links…
        const link = this.svg.selectAll("path.link").data(links, d => {
            return d.target.id;
        });

        // Enter any new links at the parent's previous position.
        link.enter()
            .insert("path", "g")
            .attr("class", "link")
            .attr("d", () => {
                const o = { x: source.prevX, y: source.prevY };
                return this.drawDiagonal({ source: o, target: o });
            });

        // Transition links to their new position.
        link.transition()
            .duration(this.animationDuration)
            .attr("d", this.drawDiagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit()
            .transition()
            .duration(this.animationDuration)
            .attr("d", () => {
                const o = { x: source.x, y: source.y };
                return this.drawDiagonal({ source: o, target: o });
            })
            .remove();
    }

    updateTree(source) {
        const nodes = this.treeVisual.nodes(this.root).reverse();
        const links = this.treeVisual.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(d => {
            d.y = d.depth * 180;
        });

        this.updateNodes(nodes, source);
        this.updateLinks(links, source);

        // Stash the old positions for transition.
        nodes.forEach(d => {
            d.prevX = d.x;
            d.prevY = d.y;
        });
    }
}

angular.module("D3Angular").directive("collapsibleTree", [
    "$window",
    "$filter",
    function($window, $filter) {
        return {
            restrict: "E", // Directive Scope is Element,
            scope: {
                data: "="
            },
            link: scope => {
                const margin = { top: 20, right: 120, bottom: 20, left: 120 };
                const width = 960 - margin.right - margin.left;
                const height = 600 - margin.top - margin.bottom;
                const d3Tree = new D3Tree(
                    scope.data,
                    margin,
                    width,
                    height,
                    $filter,
                    scope
                );
                d3Tree.updateTree(d3Tree.root);
            }
        };
    }
]);

angular.module("D3Angular").filter("percentage", [
    "$filter",
    function($filter) {
        return (input, decimals) => {
            return `${$filter("number")(input * 100, decimals)}%`;
        };
    }
]);
