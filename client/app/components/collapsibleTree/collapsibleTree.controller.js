/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
import * as d3 from "d3";

class collapsibleTreeCtrl {
    constructor($element) {
        this.$element = $element;
        this.name = "collapsibleTree";
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
        this.childrenPresent = d => Boolean(d.children || d._children);
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
                `translate(${this.dimensions.margin.left},${this.dimensions.margin.top})`
            );

        this.drawDiagonal = d3
            .linkHorizontal()
            .x(d => d.y)
            .y(d => d.x);

        // eslint-disable-next-line prefer-destructuring
        this.root = d3.hierarchy(this.treeData[0], d => d.children);
        this.root.prevX = this.dimensions.height / 2;
        this.root.prevY = 0;

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
        const nodeSelector = this.svgContainer.selectAll("g").data(nodes, d => {
            if (d.id === undefined) {
                this.newestNodeId += 1;
                d.id = this.newestNodeId;
            }
            return d.id;
        });

        const getOffset = d => (this.childrenPresent(d) ? -13 : 13);
        const parentPositionTranslation = d =>
            d.parent
                ? `translate(${d.parent.y},${d.parent.x})`
                : `translate(${d.prevY},${d.prevX})`;
        const newPositionTranslation = d => `translate(${d.y},${d.x})`;
        // Enter any new nodes at the parent's previous position.
        nodeSelector.join(
            enter => {
                const nodeContainer = enter
                    .append("g")
                    .attr("class", "node")
                    .attr("transform", parentPositionTranslation)
                    .style("visibility", "hidden")
                    .on("click", d => {
                        if (d.children) {
                            d._children = d.children;
                            d.children = null;
                        } else {
                            d.children = d._children;
                            d._children = null;
                        }
                        this.updateTree(this.root);
                    });

                const nodeCircle = nodeContainer
                    .insert("circle")
                    .attr("isInPath", d => d.data.isInPath)
                    .attr("r", 0)
                    .style("fill-opacity", 1);

                const nodeText = nodeContainer
                    .insert("text")
                    .attr("x", getOffset)
                    .attr("dy", ".35em")
                    .classed("leftToRight", () => true)
                    .classed("childrenPresent", this.childrenPresent)
                    .text(d => d.data.name)
                    .style("fill-opacity", 0);

                nodeContainer
                    .transition()
                    .duration(this.animationDuration)
                    .attr("transform", newPositionTranslation)
                    .style("visibility", "visible");

                nodeCircle
                    .transition()
                    .duration(this.animationDuration)
                    .attr("r", 10);

                nodeText
                    .transition()
                    .duration(this.animationDuration)
                    .style("fill-opacity", 1);
            },

            update => {
                // Transition nodes to their new position.
                update
                    .transition()
                    .duration(this.animationDuration)
                    .attr("transform", newPositionTranslation);
            },

            // Transition exiting nodes to the parent's new position.
            exit => {
                const nodeContainer = exit;
                const nodeCircle = exit.select("circle");
                const nodeText = exit.select("text");

                nodeContainer
                    .transition()
                    .duration(this.animationDuration)
                    .attr("transform", d =>
                        d.parent
                            ? `translate(${d.parent.y},${d.parent.x})`
                            : `translate(${d.y},${d.x})`
                    )
                    .remove();

                nodeCircle
                    .transition()
                    .duration(this.animationDuration)
                    .attr("r", 0);

                nodeText
                    .transition()
                    .duration(this.animationDuration)
                    .style("fill-opacity", 0);
            }
        );
    }

    updateLinks(links, source) {
        // Update the links…
        const linkSelector = this.svgContainer
            .selectAll("path.link")
            .data(links, d => {
                return d.id;
            });

        linkSelector.join(
            enter => {
                enter
                    .insert("path", "g")
                    .style("stroke-width", "1.5px")
                    .transition()
                    .duration(this.animationDuration)
                    .attr("d", d =>
                        this.drawDiagonal({ source: d, target: d.parent })
                    )
                    .attr("class", d =>
                        d.data.isInPath ? "link isInPath" : "link"
                    );
            },

            update => {
                update
                    .transition()
                    .duration(this.animationDuration)
                    .attr("class", d =>
                        d.data.isInPath ? "link isInPath" : "link"
                    );
            },

            exit => {
                exit.transition()
                    .duration(this.animationDuration)
                    .attr("d", d => {
                        const o = { x: d.parent.x, y: d.parent.y };
                        return this.drawDiagonal({ source: o, target: o });
                    })
                    .remove();
            }
        );
    }

    updateTree(source) {
        const treeData = this.treeVisual(source);
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

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

export default collapsibleTreeCtrl;
