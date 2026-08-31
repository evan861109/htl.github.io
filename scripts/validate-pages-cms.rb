require "json"
require "yaml"

ROOT = File.expand_path("..", __dir__)
ERRORS = []

def fail_check(message)
  ERRORS << message
end

def resolve_field(field, components, path)
  component_name = field["component"]
  return field unless component_name

  component = components[component_name]
  unless component.is_a?(Hash)
    fail_check("#{path} references missing component #{component_name}")
    return field
  end

  component.merge(field.reject { |key, _| key == "component" })
end

def validate_field_definition(field, components, media_names, path)
  unless field.is_a?(Hash)
    fail_check("#{path} must be an object")
    return
  end

  has_type = field.key?("type")
  has_component = field.key?("component")
  fail_check("#{path} must define exactly one of type or component") if has_type == has_component

  resolved = resolve_field(field, components, path)
  type = resolved["type"]
  fail_check("#{path} has unsupported type #{type.inspect}") unless %w[boolean code date file image number object reference rich-text select string text uuid].include?(type)

  if type == "object"
    fields = resolved["fields"]
    if !fields.is_a?(Array) || fields.empty?
      fail_check("#{path} object must define fields")
    else
      names = fields.map { |nested| nested["name"] if nested.is_a?(Hash) }.compact
      duplicates = names.group_by { |name| name }.select { |_, matches| matches.length > 1 }.keys
      fail_check("#{path} has duplicate fields: #{duplicates.join(', ')}") unless duplicates.empty?
      fields.each_with_index do |nested, index|
        validate_field_definition(nested, components, media_names, "#{path}.fields[#{index}]")
      end
    end
  end

  list = resolved["list"]
  if list.is_a?(Hash)
    fail_check("#{path}.list must include collapsible for Pages CMS compatibility") unless list.key?("collapsible")
    if list["min"] && list["max"] && list["min"] > list["max"]
      fail_check("#{path}.list min cannot exceed max")
    end
  elsif !list.nil? && list != true && list != false
    fail_check("#{path}.list must be a boolean or object")
  end

  media_name = resolved.dig("options", "media")
  if media_name.is_a?(String) && !media_names.include?(media_name)
    fail_check("#{path} references missing media source #{media_name}")
  end
end

def validate_value(value, field, components, path)
  resolved = resolve_field(field, components, path)
  list = resolved["list"]
  if list
    unless value.is_a?(Array)
      fail_check("#{path} must be an array")
      return
    end
    if list.is_a?(Hash)
      fail_check("#{path} must contain at least #{list['min']} item(s)") if list["min"] && value.length < list["min"]
      fail_check("#{path} must contain at most #{list['max']} item(s)") if list["max"] && value.length > list["max"]
    end
    scalar_field = resolved.reject { |key, _| key == "list" }
    value.each_with_index { |item, index| validate_value(item, scalar_field, components, "#{path}[#{index}]") }
    return
  end

  case resolved["type"]
  when "object"
    unless value.is_a?(Hash)
      fail_check("#{path} must be an object")
      return
    end
    validate_record(value, resolved["fields"] || [], components, path)
  when "boolean"
    fail_check("#{path} must be true or false") unless value == true || value == false
  when "number"
    fail_check("#{path} must be a number") unless value.is_a?(Numeric)
  else
    fail_check("#{path} must be a string") unless value.is_a?(String)
  end

  pattern = resolved["pattern"]
  regex_source = pattern.is_a?(Hash) ? pattern["regex"] : pattern
  if regex_source && value.is_a?(String)
    begin
      fail_check("#{path} does not match its CMS pattern") unless Regexp.new(regex_source).match?(value)
    rescue RegexpError => error
      fail_check("#{path} has an invalid CMS pattern: #{error.message}")
    end
  end
end

def validate_record(data, fields, components, path)
  unless data.is_a?(Hash)
    fail_check("#{path} must be an object")
    return
  end

  field_map = fields.each_with_object({}) do |field, result|
    result[field["name"]] = field if field.is_a?(Hash) && field["name"]
  end
  unknown = data.keys - field_map.keys
  fail_check("#{path} contains fields missing from .pages.yml: #{unknown.join(', ')}") unless unknown.empty?

  field_map.each do |name, field|
    resolved = resolve_field(field, components, "#{path}.#{name}")
    unless data.key?(name)
      fail_check("#{path}.#{name} is required by the CMS schema") if resolved["required"]
      next
    end
    validate_value(data[name], resolved, components, "#{path}.#{name}")
  end
end

begin
  config = YAML.safe_load(File.read(File.join(ROOT, ".pages.yml")), aliases: false)
rescue StandardError => error
  warn "Pages CMS validation failed: #{error.message}"
  exit 1
end

unless config.dig("settings", "content", "merge") == true
  fail_check("settings.content.merge must be true so CMS saves preserve unmodeled content")
end

media = config["media"]
media = [media] if media.is_a?(Hash)
media = [] unless media.is_a?(Array)
media_names = media.map { |source| source["name"] if source.is_a?(Hash) }.compact
fail_check("Pages CMS media source names must be unique") unless media_names.uniq.length == media_names.length
%w[images videos].each do |name|
  fail_check("Pages CMS media source #{name} is missing") unless media_names.include?(name)
end

components = config["components"].is_a?(Hash) ? config["components"] : {}
components.each do |name, component|
  validate_field_definition(component, components, media_names, "components.#{name}")
end

content_entries = config["content"].is_a?(Array) ? config["content"] : []
content_entries.each_with_index do |entry, index|
  path = "content[#{index}]"
  unless entry.is_a?(Hash) && entry["type"] == "file"
    fail_check("#{path} must be a file entry")
    next
  end
  fail_check("#{path} must disable deletion") unless entry.dig("operations", "delete") == false
  relative_path = entry["path"]
  absolute_path = File.join(ROOT, relative_path.to_s)
  unless File.file?(absolute_path)
    fail_check("#{path} references missing file #{relative_path}")
    next
  end
  begin
    data = JSON.parse(File.read(absolute_path))
    validate_record(data, entry["fields"] || [], components, relative_path)
  rescue JSON::ParserError => error
    fail_check("#{relative_path} is invalid JSON: #{error.message}")
  end
end

if ERRORS.empty?
  puts "Pages CMS configuration and content contract are valid."
else
  warn "Pages CMS validation failed with #{ERRORS.length} error(s):"
  ERRORS.each { |error| warn "- #{error}" }
  exit 1
end
