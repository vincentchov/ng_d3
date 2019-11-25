/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */

class CollapsibleTreeCtrl {
    constructor($scope, $element) {
        this.$scope = $scope;
        this.$element = $element;
        const margin = { top: 20, right: 120, bottom: 20, left: 120 };
        const width = 960 - margin.right - margin.left;
        const height = 500 - margin.top - margin.bottom;

        this.dimensions = {
            margin: margin,
            width: width,
            height: height
        };

        this.newestNodeId = 0;
        this.animationDuration = 750;
    }

    $onInit() {
        this.treeVisual = d3
            .tree()
            .size([this.dimensions.height, this.dimensions.width]);

        this.svgContainer = d3
            .select(this.$element[0].querySelector(".visualization"))
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
            .call(
                d3.zoom().on("zoom", () => {
                    this.svgContainer.attr("transform", d3.event.transform);
                })
            )
            .append("g")
            .attr(
                "transform",
                `translate(${this.dimensions.margin.left},${
                    this.dimensions.margin.top
                })`
            );

        this.drawDiagonal = d3
            .linkHorizontal()
            .x(d => d.y)
            .y(d => d.x);

        // eslint-disable-next-line prefer-destructuring
        this.root = d3.hierarchy(this.treeData[0], d => d.children);
        this.root.prevX = this.dimensions.height / 2;
        this.root.prevY = 0;

        d3.select(window.self.frameElement).style("height", "500px");
        this.updateTree(this.root);
    }

    clearAll(node, clearHighlighting = false) {
        if (clearHighlighting) {
            node.isInPath = false;
        }

        if (node.children) {
            node.children.forEach(child => {
                this.clearAll(child, clearHighlighting);
            });
        } else if (node._children) {
            node._children.forEach(child => {
                this.clearAll(child, clearHighlighting);
            });
        }
    }

    setColorPath() {
        if (!this.path.length) {
            throw new Error("Path must be non-empty");
        } else if (this.root.data.name !== this.path[0]) {
            throw new Error("Root of tree must be first node in path.");
        }

        const pathCopy = [...this.path].reverse();
        pathCopy.pop();

        if (this.root.data.isInPath) {
            this.clearAll(this.root.data, true);
            this.updateTree(this.root);
            return;
        }

        this.setColorPathHelper(this.root.data, pathCopy);
        this.updateTree(this.root);

        if (pathCopy.length) {
            throw new Error("Path does not exist in tree.");
        }
    }

    setColorPathHelper(root, path) {
        root.isInPath = true;
        if (!path.length) {
            return root;
        }

        const nextNode = path.pop();
        if ("children" in root && root.children.length) {
            for (let i = 0; i < root.children.length; i++) {
                if (root.children[i].name === nextNode) {
                    this.setColorPathHelper(root.children[i], path);
                }
            }
        }

        return root;
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
                    if (d.data.isInPath) {
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
                    return d.data.name;
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

            return nodeEnter;
        };

        const setNodeUpdate = nodeEnter => {
            // Transition nodes to their new position.
            const nodeUpdate = nodeEnter
                .merge(nodeSelector)
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
                    if (d.data.isInPath) {
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

        const nodeEnterSelector = setNodeEnter();
        setNodeUpdate(nodeEnterSelector);
        setNodeExit();
    }

    updateLinks(links, source) {
        // Update the links…
        const link = this.svgContainer.selectAll("path.link").data(links, d => {
            return d.id;
        });

        // Enter any new links at the parent's previous position.
        const linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("class", "link")
            .attr("d", () => {
                const o = { x: source.prevX, y: source.prevY };
                return this.drawDiagonal({ source: o, target: o });
            });

        link.style("stroke", d => {
            if (d.data.isInPath) {
                return "green";
            }
            return "#ccc";
        });

        const linkUpdate = linkEnter.merge(link);
        // Transition links to their new position.
        linkUpdate
            .transition()
            .duration(this.animationDuration)
            .attr("d", d => this.drawDiagonal({ source: d, target: d.parent }));

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
        const treeData = this.treeVisual(source);
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

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

angular.module("app").component("collapsibleTree", {
    bindings: {
        treeData: "<",
        path: "<"
    },
    templateUrl: "collapsibleTreeTemplate.html",
    controller: ["$scope", "$element", CollapsibleTreeCtrl]
});
