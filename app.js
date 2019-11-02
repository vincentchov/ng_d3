/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */

angular.module("D3Angular", []);

angular.module("D3Angular").controller("MainCtrl", [
    "$scope",
    "$http",
    function($scope, $http) {
        this.diagramData = [
            {
                name: "Top Level",
                parent: "null",
                children: [
                    {
                        name: "Level 2: A",
                        parent: "Top Level",
                        children: [
                            {
                                name: "Son of A",
                                parent: "Level 2: A"
                            },
                            {
                                name: "Daughter of A",
                                parent: "Level 2: A"
                            }
                        ]
                    },
                    {
                        name: "Level 2: B",
                        parent: "Top Level"
                    }
                ]
            }
        ];

        this.originalDiagramData = [];

        this.path = ["Top Level", "Level 2: A", "Son of A"];

        this.setColorPath = (tree, path) => {
            if (!path.length) {
                throw new Error("Path must be non-empty");
            } else if (tree[0].name !== path[0]) {
                throw new Error("Root of tree must be first node in path.");
            }

            if (this.originalDiagramData.length) {
                this.diagramData = [...this.originalDiagramData];
                this.originalDiagramData = [];
                return;
            }

            this.originalDiagramData = angular.copy(this.diagramData);

            const path_copy = [...path].reverse();
            const tree_copy = angular.copy(tree);
            path_copy.pop();
            const highlighted_tree = [helper(tree_copy[0], path_copy)];

            if (path_copy.length) {
                throw new Error("Path does not exist in tree.");
            }

            this.diagramData = angular.copy(highlighted_tree);
        };
    }
]);

function helper(root, path) {
    root.isInPath = true;
    if (!path.length) {
        return root;
    }

    const next_node = path.pop();
    if ("children" in root && root.children.length) {
        root.children.map(child => {
            return child.name === next_node ? helper(child, path) : child;
        });
    }

    return root;
}

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

        this.treeVisual = d3.layout
            .tree()
            .size([this.dimensions.height, this.dimensions.width]);

        this.svgContainer = d3
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
        this.root = angular.copy(treeData[0]);
        this.root.prevX = this.dimensions.height / 2;
        this.root.prevY = 0;

        d3.select(window.self.frameElement).style("height", "500px");
    }

    updateNodes(nodes, source) {
        const nodeSelector = this.svgContainer
            .selectAll("g.node")
            .data(nodes, d => {
                if (d.id === undefined) {
                    this.newestNodeId += 1;
                    d.id = this.newestNodeId;
                }
                return d.id;
            });

        const setNodeEnter = () => {
            // Enter any new nodes at the parent's previous position.
            const nodeEnter = nodeSelector
                .enter()
                .append("g")
                .attr("class", "node")
                .attr("transform", () => {
                    return `translate(${source.prevY},${source.prevX})`;
                });

            // Color a node lightsteelblue if it's collapsed
            nodeEnter
                .append("circle")
                .attr("r", 1e-6)
                .style("fill", d => {
                    return d._children ? "lightsteelblue" : "#fff";
                })
                .style("stroke", d => {
                    if (d.isInPath) {
                        return "green";
                    }

                    return "#888";
                });

            nodeEnter
                .append("text")
                .attr("x", d => {
                    return d.children || d._children ? -13 : 13;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", d => {
                    return d.children || d._children ? "end" : "start";
                })
                .text(d => {
                    return d.name;
                })
                .style("fill-opacity", 1e-6);

            nodeEnter.on("click", d => {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                this.updateTree(d);
            });
        };

        const setNodeUpdate = () => {
            // Transition nodes to their new position.
            const nodeUpdate = nodeSelector
                .transition()
                .duration(this.animationDuration)
                .attr("transform", d => {
                    return `translate(${d.y},${d.x})`;
                });

            // Color a node lightsteelblue if it's collapsed
            nodeUpdate
                .select("circle")
                .attr("r", 10)
                .style("fill", d => {
                    return d._children ? "lightsteelblue" : "#fff";
                })
                .style("stroke", d => {
                    if (d.isInPath) {
                        return "green";
                    }

                    return "#888";
                });

            nodeUpdate.select("text").style("fill-opacity", 1);
        };

        const setNodeExit = () => {
            // Transition exiting nodes to the parent's new position.
            const nodeExit = nodeSelector
                .exit()
                .transition()
                .duration(this.animationDuration)
                .attr("transform", () => {
                    return `translate(${source.y},${source.x})`;
                })
                .remove();

            nodeExit.select("circle").attr("r", 1e-6);
            nodeExit.select("text").style("fill-opacity", 1e-6);
        };

        setNodeEnter();
        setNodeUpdate();
        setNodeExit();
    }

    updateLinks(links, source) {
        // Update the links…
        const link = this.svgContainer.selectAll("path.link").data(links, d => {
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

        link.style("stroke", d => {
            if (d.target.isInPath) {
                return "green";
            }
            return "#ccc";
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
                const height = 500 - margin.top - margin.bottom;
                const d3Tree = new D3Tree(
                    scope.data,
                    margin,
                    width,
                    height,
                    $filter,
                    scope
                );
                d3Tree.updateTree(d3Tree.root);

                scope.$watchCollection("data", (newData, oldData) => {
                    if (newData !== oldData) {
                        d3Tree.root = angular.copy(newData[0]);
                        d3Tree.root.prevX = d3Tree.dimensions.height / 2;
                        d3Tree.root.prevY = 0;
                        d3Tree.updateTree(d3Tree.root);
                    }
                });
            }
        };
    }
]);
